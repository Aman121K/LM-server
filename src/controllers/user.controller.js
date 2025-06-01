const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

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
                    userType: user.usertype
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

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE UserEmail = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email'
            });
        }

        // Generate a random password
        const newPassword = Math.random().toString(36).slice(-8);

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password in database
        await db.execute(
            'UPDATE tblusers SET Password = ? WHERE UserEmail = ?',
            [hashedPassword, email]
        );

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'javascript.pgl@gmail.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset - Lead Management System',
            html: `
                <h1>Password Reset</h1>
                <p>Your new password is: <strong>${newPassword}</strong></p>
                <p>Please login with this password and change it immediately for security reasons.</p>
                <p>If you didn't request this password reset, please contact support immediately.</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: 'New password has been sent to your email'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset'
        });
    }
};
exports.getTlUser=async(req,res)=>{
    try {
        const [users] = await db.execute(
            'SELECT id, FullName, Username, UserEmail FROM tblusers WHERE usertype = ?',
            ['TL']
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No TL users found'
            });
        }

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}
