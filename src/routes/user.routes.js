const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.get('/tl', userController.getTls);
router.get('/allUserList', userController.allUserList);


// Protected routes
router.post('/logout', auth, userController.logout);
router.get('/me', auth, userController.getCurrentUser);
router.delete('/:id', auth, userController.deleteUser);
router.put('/:id', auth, userController.updateUser);
router.get('/reports/:callby', auth, userController.getUserReports);
router.get('/under-tl/:tlId', userController.getUsersByTl);
router.get('/call-statuses/by-tlname/:tlName', userController.getUsersCallStatusesByTlName);



module.exports = router; 