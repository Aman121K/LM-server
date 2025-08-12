const performance = (req, res, next) => {
    const start = Date.now();
    
    // Add performance tracking to response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, url, statusCode } = req;
        
        console.log(`${method} ${url} - ${statusCode} - ${duration}ms`);
        
        // Log slow requests
        if (duration > 2000) {
            console.warn(`⚠️  SLOW REQUEST: ${method} ${url} took ${duration}ms`);
        }
    });
    
    next();
};

module.exports = performance;
