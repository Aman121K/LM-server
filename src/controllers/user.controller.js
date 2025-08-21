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
    const startTime = Date.now();
    try {
        const { username, password } = req.body;
        console.log(`Login attempt for: ${username}`);

        // Find user and update login status in a single query using JOIN
        const [users] = await db.execute(
            `SELECT u.*, 
                    CASE WHEN u.loginstatus = 0 THEN 1 ELSE u.loginstatus END as newLoginStatus
             FROM tblusers u 
             WHERE u.Username = ?`,
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];
        console.log(`User found in ${Date.now() - startTime}ms`);

        // Check password with optimized bcrypt comparison
        const passwordCheckStart = Date.now();
        const isMatch = await bcrypt.compare(password, user.Password);
        console.log(`Password check completed in ${Date.now() - passwordCheckStart}ms`);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update login status only if it was 0 (not already logged in)
        if (user.loginstatus === 0) {
            await db.execute(
                'UPDATE tblusers SET loginstatus = 1 WHERE id = ?',
                [user.id]
            );
        }

        // Create token
        const tokenStart = Date.now();
        const token = jwt.sign(
            { id: user.id, username: user.Username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );
        console.log(`Token created in ${Date.now() - tokenStart}ms`);

        const totalTime = Date.now() - startTime;
        console.log(`Total login time: ${totalTime}ms`);

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
            },
            performance: {
                totalTime: `${totalTime}ms`
            }
        });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`Login error after ${totalTime}ms:`, error);
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

// Forgot Password - Generate reset token and send email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        console.log("Forgot password request for email:", email);
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

        const user = users[0];

        // Generate a secure random token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store the reset token in database (you'll need to create this table)
        try {
            await db.execute(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?',
                [user.id, resetToken, resetTokenExpiry, resetToken, resetTokenExpiry]
            );
        } catch (error) {
            // If table doesn't exist, create it
            if (error.code === 'ER_NO_SUCH_TABLE') {
                await db.execute(`
                    CREATE TABLE password_reset_tokens (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        token VARCHAR(255) NOT NULL UNIQUE,
                        expires_at DATETIME NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE
                    )
                `);
                await db.execute(
                    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                    [user.id, resetToken, resetTokenExpiry]
                );
            } else {
                throw error;
            }
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'javascript.pgl@gmail.com',
                pass: 'msdf qhmj fhbv xlbm'
            }
        });

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

        // Email content
        const mailOptions = {
            from: 'javascript.pgl@gmail.com',
            to: email,
            subject: 'Password Reset Request - Lead Management System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                    <p>Hello ${user.FullName},</p>
                    <p>You have requested to reset your password for the Lead Management System.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                    <p>If you didn't request this password reset, please ignore this email or contact support immediately.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">This is an automated message from the Lead Management System.</p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: 'Password reset link has been sent to your email'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request'
        });
    }
};

// Reset Password - Verify token and update password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        // Find the reset token
        const [tokens] = await db.execute(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        const resetToken = tokens[0];

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password
        await db.execute(
            'UPDATE tblusers SET Password = ? WHERE id = ?',
            [hashedPassword, resetToken.user_id]
        );

        // Delete the used token
        await db.execute(
            'DELETE FROM password_reset_tokens WHERE token = ?',
            [token]
        );

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
};

// Verify reset token (for frontend validation)
exports.verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        const [tokens] = await db.execute(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid'
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
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
        const { page = 1, limit = 100 } = req.query;
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