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

const db = require('../config/db');
// Protected routes
router.post('/logout', auth, userController.logout);
router.get('/me', auth, userController.getCurrentUser);
router.delete('/:id', auth, userController.deleteUser);
router.put('/:id', auth, userController.updateUser);
router.get('/reports/:callby', auth, userController.getUserReports);
router.get('/under-tl/:tlId', userController.getUsersByTl);
router.get('/call-statuses/by-tlname/:tlName', userController.getUsersCallStatusesByTlName);

router.get('/tls-users-report', async (req, res) => {
    try {
        const [tls] = await db.execute("SELECT id, FullName, Username FROM tblusers WHERE userType = 'tl'");
        console.log("tls>>",tls)
        const report = [];

        for (const tl of tls) {
            const [users] = await db.execute("SELECT id, FullName, Username FROM tblusers WHERE tl_name = ?", [tl.Username]);
            const userStats = [];
            for (const user of users) {
                const [[{ totalData }]] = await db.execute("SELECT COUNT(*) as totalData FROM tblmaster WHERE callby = ?", [user.Username]);
                const [[{ totalCallsDone }]] = await db.execute("SELECT COUNT(*) as totalCallsDone FROM tblmaster WHERE callby = ? AND callstatus != ''", [user.Username]);
                const [[{ totalCallsPending }]] = await db.execute("SELECT COUNT(*) as totalCallsPending FROM tblmaster WHERE callby = ? AND callstatus = ''", [user.Username]);
                userStats.push({
                    userName: user.FullName,
                    totalData,
                    totalCallsDone,
                    totalCallsPending
                });
            }
            report.push({
                tlName: tl.FullName,
                users: userStats
            });

            console.log("report>>",report)
        }

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('TLS report (MySQL) error:', error);
        res.status(500).json({ success: false, message: 'Error generating report' });
    }
});






module.exports = router; 