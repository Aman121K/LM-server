const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const auth = require('../src/middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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

// Upload users data - OPTIMIZED VERSION for tblusers table
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let fileReadTime, processTime, dbInsertTime;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB'
      });
    }

    console.log(`📁 Processing file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB)`);

    // Read Excel file
    const fileReadStart = Date.now();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    fileReadTime = Date.now() - fileReadStart;
    console.log(`📖 File read time: ${fileReadTime}ms`);

    const worksheet = workbook.getWorksheet(1);
    const totalRows = worksheet.rowCount - 1; // Exclude header
    console.log(`📊 Total rows to process: ${totalRows}`);

    if (totalRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data rows found in file'
      });
    }

    // Process rows in batches
    const processStart = Date.now();
    const users = [];
    const batchSize = 100; // Process 100 rows at a time
    let processedRows = 0;
    let skippedRows = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Validate required fields - map to your tblusers schema
      const fullName = row.getCell(1).value;
      const username = row.getCell(2).value;
      const userEmail = row.getCell(3).value;
      const userType = row.getCell(4).value || 'user';
      const tlName = row.getCell(5).value || null;
      
      if (!fullName || !username || !userEmail) {
        console.warn(`⚠️  Skipping row ${rowNumber}: Missing required fields (FullName, Username, or UserEmail)`);
        skippedRows++;
        continue;
      }

      // Generate a default password for new users
      const defaultPassword = Math.random().toString(36).slice(-8);
      
      const user = {
        FullName: fullName.toString().trim(),
        Username: username.toString().trim(),
        UserEmail: userEmail.toString().trim(),
        Password: defaultPassword, // Will be hashed before insert
        userType: userType.toString().trim(),
        tl_name: tlName ? tlName.toString().trim() : null,
        loginstatus: 0, // Default to logged out
        created_at: new Date()
      };
      
      users.push(user);
      processedRows++;

      // Process in batches
      if (users.length >= batchSize || rowNumber === worksheet.rowCount) {
        console.log(`🔄 Processing batch ${Math.ceil(processedRows / batchSize)}/${Math.ceil(totalRows / batchSize)}`);
        
        // Insert batch into database
        const batchStart = Date.now();
        await insertUsersBatch(users);
        const batchTime = Date.now() - batchStart;
        console.log(`✅ Batch processed in ${batchTime}ms`);
        
        // Clear batch array
        users.length = 0;
      }
    }

    processTime = Date.now() - processStart;
    const totalTime = Date.now() - startTime;

    // Clean up uploaded file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log(`🗑️  Cleaned up temporary file: ${req.file.path}`);
    }

    console.log(`🎉 Upload completed in ${totalTime}ms`);
    console.log(`   - File read: ${fileReadTime}ms`);
    console.log(`   - Processing: ${processTime}ms`);
    console.log(`   - Total rows: ${processedRows}`);
    console.log(`   - Skipped rows: ${skippedRows}`);

    res.json({
      success: true,
      message: `Users imported successfully (${processedRows} users, ${skippedRows} skipped)`,
      performance: {
        totalTime: `${totalTime}ms`,
        fileReadTime: `${fileReadTime}ms`,
        processTime: `${processTime}ms`,
        rowsProcessed: processedRows,
        rowsSkipped: skippedRows,
        averageTimePerRow: `${(totalTime / processedRows).toFixed(2)}ms`
      },
      summary: {
        totalRows: totalRows,
        processedRows: processedRows,
        skippedRows: skippedRows,
        defaultPassword: 'Default password generated for new users. They should change it on first login.'
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Upload failed after ${totalTime}ms:`, error);
    
    // Clean up file on error
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error importing users',
      performance: {
        totalTime: `${totalTime}ms`,
        error: error.message
      }
    });
  }
});

// Helper function to insert users in batches for tblusers table
async function insertUsersBatch(users) {
  if (users.length === 0) return;

  try {
    // Use transaction for data consistency
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Hash passwords for all users in the batch
      const bcrypt = require('bcryptjs');
      const hashedUsers = await Promise.all(users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.Password, salt);
        return {
          ...user,
          Password: hashedPassword
        };
      }));

      // Prepare batch insert statement for tblusers table
      const placeholders = hashedUsers.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const values = hashedUsers.flatMap(user => [
        user.FullName,
        user.Username, 
        user.UserEmail,
        user.Password,
        user.userType,
        user.tl_name,
        user.loginstatus,
        user.created_at
      ]);
      
      const [result] = await connection.execute(
        `INSERT INTO tblusers (FullName, Username, UserEmail, Password, userType, tl_name, loginstatus, created_at) VALUES ${placeholders}`,
        values
      );

      await connection.commit();
      console.log(`✅ Inserted ${users.length} users in batch`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Batch insert error:', error);
    throw error;
  }
}

// Admin-only: Get TLs and their users with lead stats (MySQL version)
router.get('/tls-users-report', async (req, res) => {
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