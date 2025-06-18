const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();

// CORS configuration
// const corsOptions = {
//     origin: ['http://localhost:3000', 'http://127.0.0.1:3000', ''],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     credentials: true,
//     optionsSuccessStatus: 200
// };

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
db.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('MySQL connection error:', err);
    });

// Routes
const leadRoutes = require('./routes/lead.routes');
const userRoutes = require('./routes/user.routes');

app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 