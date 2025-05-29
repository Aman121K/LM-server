const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);

    // Get user from database
    const [user] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user || user.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Get the stored hashed password and salt from the database
    const storedPassword = user[0].password;
    const salt = user[0].salt;
    
    console.log('Stored password hash:', storedPassword);
    console.log('Salt from database:', salt);
    console.log('Input password:', password);

    // Try direct comparison first
    const directMatch = storedPassword === password;
    console.log('Direct comparison result:', directMatch);

    // Try bcrypt comparison
    const bcryptMatch = await bcrypt.compare(password, storedPassword);
    console.log('Bcrypt comparison result:', bcryptMatch);

    // Try with salt
    const passwordWithSalt = password + salt;
    const saltedMatch = await bcrypt.compare(passwordWithSalt, storedPassword);
    console.log('Salted comparison result:', saltedMatch);

    // If any comparison method works, proceed with login
    if (directMatch || bcryptMatch || saltedMatch) {
      // Generate JWT token
      const token = jwt.sign(
        { id: user[0].id, username: user[0].username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data and token
      return res.json({
        success: true,
        data: {
          token,
          id: user[0].id,
          username: user[0].username,
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

module.exports = router; 