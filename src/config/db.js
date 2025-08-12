const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'infinity.herosite.pro',
    user: 'ssuqgpoy_admindash1',
    password: 'Sharadb@!123',
    database: 'ssuqgpoy_dashboard_1',
    waitForConnections: true,
    connectionLimit: 20, // Increased from 11
    queueLimit: 0,
    acquireTimeout: 60000, // 60 seconds
    timeout: 60000, // 60 seconds
    reconnect: true,
    charset: 'utf8mb4',
    // Performance optimizations
    multipleStatements: false,
    dateStrings: true,
    // Connection pool optimizations
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection and log pool status
pool.on('connection', (connection) => {
    console.log('New database connection established');
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
});

module.exports = pool; 