const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;

        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT * FROM tblusers WHERE Username = ? OR UserEmail = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO tblusers (FullName, Username, UserEmail, Password) VALUES (?, ?, ?, ?)',
            [fullName, username, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(username, password);

        // Find user
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE Username = ?',
            [username]
        );
        console.log(JSON.stringify(users));
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.Password);
        console.log(isMatch);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update login status
        await db.execute(
            'UPDATE tblusers SET loginstatus = 1 WHERE id = ?',
            [user.id]
        );

        // Create token
        const token = jwt.sign(
            { id: user.id, username: user.Username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    fullName: user.FullName,
                    username: user.Username,
                    email: user.UserEmail,
                    userType: user.UserType
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;

        await db.execute(
            'UPDATE tblusers SET loginstatus = 0 WHERE id = ?',
            [userId]
        );

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, FullName, Username, UserEmail FROM tblusers WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 