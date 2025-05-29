const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Get filtered leads and stats
router.post('/leads', auth, async (req, res) => {
  try {
    const { startDate, endDate, callStatus, mobileSearch } = req.body;

    // Build the query conditions
    let conditions = [];
    let params = [];

    if (startDate && endDate) {
      conditions.push('date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (callStatus && callStatus !== 'all') {
      conditions.push('callstatus = ?');
      params.push(callStatus);
    }

    if (mobileSearch) {
      conditions.push('mobile LIKE ?');
      params.push(`%${mobileSearch}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get leads with filters
    const [leads] = await db.query(
      `SELECT id, name, mobile, email, callstatus, date, remarks 
       FROM tblmaster 
       ${whereClause}
       ORDER BY date DESC`,
      params
    );

    // Get stats with the same filters
    const [totalLeads] = await db.query(
      `SELECT COUNT(*) as count FROM tblmaster ${whereClause}`,
      params
    );

    const [activeLeads] = await db.query(
      `SELECT COUNT(*) as count FROM tblmaster ${whereClause} AND callstatus = 'completed'`,
      params
    );

    const [pendingLeads] = await db.query(
      `SELECT COUNT(*) as count FROM tblmaster ${whereClause} AND callstatus = 'pending'`,
      params
    );

    const [completedLeads] = await db.query(
      `SELECT COUNT(*) as count FROM tblmaster ${whereClause} AND callstatus = 'completed'`,
      params
    );

    res.json({
      success: true,
      leads,
      stats: {
        totalLeads: totalLeads[0].count,
        activeLeads: activeLeads[0].count,
        pendingLeads: pendingLeads[0].count,
        completedLeads: completedLeads[0].count
      }
    });

  } catch (error) {
    console.error('Dashboard leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads'
    });
  }
});

// Generate and download report
router.post('/report', auth, async (req, res) => {
  try {
    const { startDate, endDate, callStatus, reportType } = req.body;

    // Build the query conditions
    let conditions = [];
    let params = [];

    if (startDate && endDate) {
      conditions.push('date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (callStatus && callStatus !== 'all') {
      conditions.push('callstatus = ?');
      params.push(callStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get leads for report
    const [leads] = await db.query(
      `SELECT id, name, mobile, email, callstatus, date, remarks 
       FROM tblmaster 
       ${whereClause}
       ORDER BY date DESC`,
      params
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Report');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Call Status', key: 'callstatus', width: 15 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 40 }
    ];

    // Add rows
    leads.forEach(lead => {
      worksheet.addRow({
        ...lead,
        date: new Date(lead.date).toLocaleDateString()
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
      `attachment; filename=leads-report-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

module.exports = router; 