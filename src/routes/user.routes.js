const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.post('/logout', auth, userController.logout);
router.get('/me', auth, userController.getCurrentUser);

module.exports = router; 