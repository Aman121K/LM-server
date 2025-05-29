const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'infinity.herosite.pro',
    user: 'ssuqgpoy_admindash1',
    password: 'Sharadb@!123',
    database: 'ssuqgpoy_dashboard_1',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool; 