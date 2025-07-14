const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Lead = require('../src/models/lead.model');

// Get users with filters
router.post('/users', auth, async (req, res) => {
  try {
    const { startDate, endDate, search } = req.body;

    // Build the query conditions
    let conditions = [];
    let params = [];

    if (startDate && endDate) {
      conditions.push('created_at BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get users with filters
    const [users] = await db.query(
      `SELECT id, name, email, role, status, created_at 
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    // Get stats
    const [totalUsers] = await db.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );

    const [activeUsers] = await db.query(
      `SELECT COUNT(*) as count FROM users ${whereClause} AND status = 'active'`,
      params
    );

    const [inactiveUsers] = await db.query(
      `SELECT COUNT(*) as count FROM users ${whereClause} AND status = 'inactive'`,
      params
    );

    res.json({
      success: true,
      users,
      stats: {
        totalUsers: totalUsers[0].count,
        activeUsers: activeUsers[0].count,
        inactiveUsers: inactiveUsers[0].count
      }
    });

  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Export users data
router.post('/export', auth, async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.body;

    // Build the query conditions
    let conditions = [];
    let params = [];

    if (startDate && endDate) {
      conditions.push('created_at BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (reportType !== 'all') {
      conditions.push('status = ?');
      params.push(reportType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get users for report
    const [users] = await db.query(
      `SELECT id, name, email, role, status, created_at 
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users Report');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];

    // Add rows
    users.forEach(user => {
      worksheet.addRow({
        ...user,
        created_at: new Date(user.created_at).toLocaleDateString()
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users-report-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Upload users data
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    const worksheet = workbook.getWorksheet(1);
    const users = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const user = {
          name: row.getCell(1).value,
          email: row.getCell(2).value,
          role: row.getCell(3).value || 'user',
          status: row.getCell(4).value || 'active'
        };
        users.push(user);
      }
    });

    // Insert users into database
    for (const user of users) {
      await db.query(
        'INSERT INTO users (name, email, role, status) VALUES (?, ?, ?, ?)',
        [user.name, user.email, user.role, user.status]
      );
    }

    res.json({
      success: true,
      message: 'Users imported successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing users'
    });
  }
});

// Admin-only: Get TLs and their users with lead stats
router.get('/tls-users-report', async (req, res) => {
  try {

    const tls = await User.find({ userType: 'tl' });
    console.log("tls>>",tls)
    const report = [];

    for (const tl of tls) {
      // Find users under this TL
      const users = await User.find({ tlName: tl.username });
      const userStats = [];
      for (const user of users) {
        // Count leads for this user
        const totalData = await Lead.countDocuments({ callBy: user.username });
        const totalCallsDone = await Lead.countDocuments({ callBy: user.username, callStatus: 'done' });
        const totalCallsPending = await Lead.countDocuments({ callBy: user.username, callStatus: { $ne: 'done' } });
        userStats.push({
          userName: user.fullName,
          totalData,
          totalCallsDone,
          totalCallsPending
        });
      }
      report.push({
        tlName: tl.fullName,
        users: userStats
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('TLS report error:', error);
    res.status(500).json({ success: false, message: 'Error generating report' });
  }
});

router.get('/tls-users-report',async (req, res) => {
  try {
    const [tls] = await db.execute("SELECT id, FullName, Username FROM tblusers WHERE userType = 'tl'");
    const report = [];

    for (const tl of tls) {
      const [users] = await db.execute("SELECT id, FullName, Username FROM tblusers WHERE tl_name = ?", [tl.Username]);
      const userStats = [];
      for (const user of users) {
        const [[{ totalData }]] = await db.execute("SELECT COUNT(*) as totalData FROM tblmaster WHERE callby = ?", [user.Username]);
        const [[{ totalCallsDone }]] = await db.execute("SELECT COUNT(*) as totalCallsDone FROM tblmaster WHERE callby = ? AND callstatus = 'done'", [user.Username]);
        const [[{ totalCallsPending }]] = await db.execute("SELECT COUNT(*) as totalCallsPending FROM tblmaster WHERE callby = ? AND callstatus != 'done'", [user.Username]);
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
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('TLS report (MySQL) error:', error);
    res.status(500).json({ success: false, message: 'Error generating report' });
  }
});

module.exports = router; 