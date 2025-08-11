/**
 * Pagination utility functions
 */

/**
 * Calculate pagination parameters
 * @param {number} page - Current page number (default: 1)
 * @param {number} limit - Number of items per page (default: 10)
 * @returns {object} Pagination parameters
 */
exports.getPaginationParams = (page = 1, limit = 10) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    return {
        page: pageNum,
        limit: limitNum,
        offset
    };
};

/**
 * Create pagination response object
 * @param {Array} data - Array of data items
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {object} Paginated response object
 */
exports.createPaginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
        data,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage,
            hasPrevPage,
            nextPage: hasNextPage ? page + 1 : null,
            prevPage: hasPrevPage ? page - 1 : null
        }
    };
};

/**
 * Build pagination query with LIMIT and OFFSET
 * @param {string} baseQuery - Base SQL query
 * @param {number} offset - Offset for pagination
 * @param {number} limit - Limit for pagination
 * @returns {string} Query with pagination
 */
exports.addPaginationToQuery = (baseQuery, offset, limit) => {
    return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
};
