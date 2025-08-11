const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { getPaginationParams, createPaginationResponse, addPaginationToQuery } = require('../utils/pagination');

// Register a new user
exports.register = async (req, res) => {
    try {
        const { fullName, username, email, password,tlUsername,userRole} = req.body;

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
            'INSERT INTO tblusers (FullName, Username, UserEmail, Password,tl_name,userType) VALUES (?, ?, ?, ?,?,?)',
            [fullName, username, email, hashedPassword,tlUsername,userRole]
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
    console.log("Current users ", req);
    try {
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE id = ?',
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
        console.log("email>>", email)
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
            service: 'Gmail', // For example, 'Gmail'
            auth: {
                user: 'javascript.pgl@gmail.com',
                pass: 'msdf qhmj fhbv xlbm'
            }
        });
        // const transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: 'reactjs.pgl@gmail.com',
        //         pass: 'Vikas@123@'
        //     }
        // });

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
exports.getTls = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const { offset, page: pageNum, limit: limitNum } = getPaginationParams(page, limit);

        // Get total count
        const [totalCount] = await db.execute(
            'SELECT COUNT(*) as total FROM tblusers'
        );

        // Get paginated data
        const [users] = await db.execute(
            'SELECT id, FullName, Username, UserEmail FROM tblusers LIMIT ? OFFSET ?',
            [limitNum, offset]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No TL users found'
            });
        }

        const paginatedResponse = createPaginationResponse(
            users,
            totalCount[0].total,
            pageNum,
            limitNum
        );

        res.status(200).json({
            success: true,
            ...paginatedResponse
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.allUserList = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const { offset, page: pageNum, limit: limitNum } = getPaginationParams(page, limit);

        // Get total count
        const [totalCount] = await db.execute(
            'SELECT COUNT(*) as total FROM tblusers'
        );

        // Get paginated data
        const [users] = await db.execute(
            'SELECT * FROM tblusers ORDER BY id DESC LIMIT ? OFFSET ?',
            [limitNum, offset]
        );

        const paginatedResponse = createPaginationResponse(
            users,
            totalCount[0].total,
            pageNum,
            limitNum
        );

        res.status(200).json({
            success: true,
            ...paginatedResponse
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user
        await db.execute(
            'DELETE FROM tblusers WHERE id = ?',
            [userId]
        );

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
};

// Update User
exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, username, email, password, userType } = req.body;

        // Check if user exists
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if new username or email already exists for other users
        if (username || email) {
            const [existingUsers] = await db.execute(
                'SELECT * FROM tblusers WHERE (Username = ? OR UserEmail = ?) AND id != ?',
                [username || users[0].Username, email || users[0].UserEmail, userId]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }
        }

        // Prepare update data
        const updateData = {
            FullName: fullName || users[0].FullName,
            Username: username || users[0].Username,
            UserEmail: email || users[0].UserEmail,
            usertype: userType || users[0].usertype
        };

        // If password is provided, hash it
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.Password = await bcrypt.hash(password, salt);
        }

        // Update user
        await db.execute(
            'UPDATE tblusers SET FullName = ?, Username = ?, UserEmail = ?, usertype = ?' +
            (password ? ', Password = ?' : '') +
            ' WHERE id = ?',
            [
                updateData.FullName,
                updateData.Username,
                updateData.UserEmail,
                updateData.usertype,
                ...(password ? [updateData.Password] : []),
                userId
            ]
        );

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                id: userId,
                fullName: updateData.FullName,
                username: updateData.Username,
                email: updateData.UserEmail,
                userType: updateData.usertype
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
};

// Get User Reports
exports.getUserReports = async (req, res) => {
    try {
        const { callby } = req.params;

        if (!callby) {
            return res.status(400).json({
                success: false,
                message: 'Callby parameter is required'
            });
        }

        // Get total data count
        const [totalData] = await db.execute(
            'SELECT COUNT(*) as TotalData FROM tblmaster WHERE callby = ?',
            [callby]
        );

        // Get calling done count
        const [callingDone] = await db.execute(
            'SELECT COUNT(*) as callingdone FROM tblmaster WHERE callby = ? AND callstatus = ?',
            [callby, 'Done']
        );

        // Get pending count
        const [pending] = await db.execute(
            'SELECT COUNT(*) as pending FROM tblmaster WHERE callby = ? AND (callstatus IS NULL OR callstatus != ?)',
            [callby, 'Done']
        );

        // Get calling status distribution
        const [callStatus] = await db.execute(
            'SELECT COALESCE(callstatus, "Not Called") as callstatus, COUNT(*) as tcount FROM tblmaster WHERE callby = ? GROUP BY callstatus',
            [callby]
        );

        // Get calling done by date
        const [callSubmitOn] = await db.execute(
            'SELECT DATE(submiton) as submiton, COUNT(*) as sbcount FROM tblmaster WHERE callby = ? AND callstatus = ? AND submiton IS NOT NULL GROUP BY DATE(submiton) ORDER BY submiton DESC',
            [callby, 'Done']
        );

        console.log("callSubmitOn", callSubmitOn);

        res.status(200).json({
            success: true,
            data: {
                database: {
                    totalData: totalData[0]?.TotalData || 0,
                    callingDone: callingDone[0]?.callingdone || 0,
                    pending: pending[0]?.pending || 0
                },
                callingStatus: callStatus.map(status => ({
                    callstatus: status.callstatus || 'Not Called',
                    count: status.tcount || 0
                })),
                callingDoneByDate: callSubmitOn.map(record => ({
                    date: record.submiton ? new Date(record.submiton).toISOString().split('T')[0] : null,
                    count: record.sbcount || 0
                }))
            }
        });
    } catch (error) {
        console.error('Get user reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user reports'
        });
    }
};

exports.getUsersByTl = async (req, res) => {
    try {
        const { tlId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const { offset, page: pageNum, limit: limitNum } = getPaginationParams(page, limit);

        // Get total count
        const [totalCount] = await db.execute(
            'SELECT COUNT(*) as total FROM tblusers WHERE tl_name = ?',
            [tlId]
        );

        // Get paginated data
        const [users] = await db.execute(
            'SELECT * FROM tblusers WHERE tl_name = ? LIMIT ? OFFSET ?',
            [tlId, limitNum, offset]
        );

        const paginatedResponse = createPaginationResponse(
            users,
            totalCount[0].total,
            pageNum,
            limitNum
        );

        res.status(200).json({
            success: true,
            ...paginatedResponse
        });
    } catch (error) {
        console.error('Get users by TL error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users by TL'
        });
    }
};
// Get all users under a TL and their call statuses
exports.getUsersCallStatusesByTlName = async (req, res) => {
    try {
        const { tlName } = req.params;
        if (!tlName) {
            return res.status(400).json({ success: false, message: 'tlName parameter is required' });
        }

        // 1. Get all users under this TL
        const [users] = await db.execute('SELECT id, Username, FullName, UserEmail FROM tblusers WHERE tl_name = ?', [tlName]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No users found for this TL' });
        }

        // 2. For each user, get all their call statuses from tblmaster
        const results = await Promise.all(users.map(async (user) => {
            const [statuses] = await db.execute(
                'SELECT callstatus FROM tblmaster WHERE callby = ? AND callstatus != ""',
                [user.Username]
            );
            return {
                user,
                callStatuses: statuses.map(s => s.callstatus)
            };
        }));

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.error('Error in getUsersCallStatusesByTlName:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAllUsersCallStatusByTlName = async (req, res) => {
    try {
        const { tlName } = req.params;
        if (!tlName) {
            return res.status(400).json({ success: false, message: 'tlName parameter is required' });
        }

        // 1. Get all users under this TL
        const [users] = await db.execute('SELECT id, Username, FullName, UserEmail FROM tblusers WHERE tl_name = ?', [tlName]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No users found for this TL' });
        }

        // 2. Get all unique call statuses from all users under this TL
        const userUsernames = users.map(user => user.Username);
        const placeholders = userUsernames.map(() => '?').join(',');
        
        const [allStatuses] = await db.execute(
            `SELECT DISTINCT callstatus FROM tblmaster 
             WHERE callby IN (${placeholders}) 
             AND callstatus != "" 
             AND callstatus IS NOT NULL`,
            userUsernames
        );

        // 3. Format response as array of objects with "name" property
        const formattedData = allStatuses.map(status => ({
            name: status.callstatus
        }));

        res.status(200).json({ 
            success: true, 
            data: formattedData
        });
    } catch (error) {
        console.error('Error in getAllUsersCallStatusByTlName:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};