const db = require('../config/db');

// Get all TLs
exports.getAllTLs = async (req, res) => {
    try {
        const [tls] = await db.execute(
            'SELECT id, username, tl_name, email FROM tblusers WHERE role = "tl"'
        );
        res.status(200).json({
            success: true,
            data: tls
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get TL's team members
exports.getTeamMembers = async (req, res) => {
    try {
        const [teamMembers] = await db.execute(
            'SELECT id, username, email FROM tblusers WHERE assigned_tl = ?',
            [req.params.tlId]
        );
        res.status(200).json({
            success: true,
            data: teamMembers
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get TL's team performance
exports.getTeamPerformance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Get total leads count
        const [totalLeads] = await db.execute(
            `SELECT COUNT(*) as total FROM tblmaster 
             WHERE assign_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND PostingDate BETWEEN ? AND ?`,
            [req.params.tlId, startDate, endDate]
        );

        // Get call status distribution
        const [callStatus] = await db.execute(
            `SELECT callstatus, COUNT(*) as count 
             FROM tblmaster 
             WHERE assign_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND PostingDate BETWEEN ? AND ?
             AND callstatus != ""
             GROUP BY callstatus`,
            [req.params.tlId, startDate, endDate]
        );

        // Get team members performance
        const [teamPerformance] = await db.execute(
            `SELECT 
                u.username,
                COUNT(m.id) as total_leads,
                SUM(CASE WHEN m.callstatus != "" THEN 1 ELSE 0 END) as calls_completed
             FROM tblusers u
             LEFT JOIN tblmaster m ON u.username = m.callby
             WHERE u.assigned_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND (m.PostingDate BETWEEN ? AND ? OR m.PostingDate IS NULL)
             GROUP BY u.username`,
            [req.params.tlId, startDate, endDate]
        );

        res.status(200).json({
            success: true,
            data: {
                totalLeads: totalLeads[0].total,
                callStatusDistribution: callStatus,
                teamPerformance
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get TL's daily performance
exports.getDailyPerformance = async (req, res) => {
    try {
        const { date } = req.query;
        
        // Get daily leads count
        const [dailyLeads] = await db.execute(
            `SELECT COUNT(*) as total FROM tblmaster 
             WHERE assign_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND PostingDate = ?`,
            [req.params.tlId, date]
        );

        // Get daily call status distribution
        const [dailyCallStatus] = await db.execute(
            `SELECT callstatus, COUNT(*) as count 
             FROM tblmaster 
             WHERE assign_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND PostingDate = ?
             AND callstatus != ""
             GROUP BY callstatus`,
            [req.params.tlId, date]
        );

        // Get team members daily performance
        const [teamDailyPerformance] = await db.execute(
            `SELECT 
                u.username,
                COUNT(m.id) as total_leads,
                SUM(CASE WHEN m.callstatus != "" THEN 1 ELSE 0 END) as calls_completed
             FROM tblusers u
             LEFT JOIN tblmaster m ON u.username = m.callby
             WHERE u.assigned_tl = (SELECT tl_name FROM tblusers WHERE id = ?)
             AND (m.PostingDate = ? OR m.PostingDate IS NULL)
             GROUP BY u.username`,
            [req.params.tlId, date]
        );

        res.status(200).json({
            success: true,
            data: {
                totalLeads: dailyLeads[0].total,
                callStatusDistribution: dailyCallStatus,
                teamPerformance: teamDailyPerformance
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 

exports.getParticularTlData=async(req,res)=>{
    try {
        const { callStatus, callby, startDate, endDate, ContactNumber } = req.query;
        console.log("Query params:", { callStatus, callby, startDate, endDate, ContactNumber });

        // Start with base query
        let query = 'SELECT * FROM tblmaster';
        const params = [];
        const conditions = [];

        // Add conditions based on parameters
        if (callby) {
            conditions.push('assign_tl = ?');
            params.push(callby);
        }

        if (callStatus !== 'All') {
            conditions.push('callstatus = ?');
            params.push(callStatus);
        } else {
            conditions.push('callstatus = ""');
        }

        // Add ContactNumber search with LIKE
        if (ContactNumber) {
            conditions.push('ContactNumber LIKE ?');
            params.push(`%${ContactNumber}%`);
        }

        // Only add date condition if both startDate and endDate are provided
        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            conditions.push('DATE(createdAt) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        // Add WHERE clause if there are any conditions
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add order by
        query += ' ORDER BY id DESC';

        console.log("Final query:", query);
        console.log("Query params:", params);

        const [leads] = await db.execute(query, params);
        console.log("Query results:", leads.length, "leads found");

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error("Error in getLeadsByCallStatus:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}