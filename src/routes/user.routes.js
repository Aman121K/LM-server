const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.get('/tl', userController.getTlUser);

// Protected routes
router.post('/logout', auth, userController.logout);
router.get('/me', auth, userController.getCurrentUser);

module.exports = router; 