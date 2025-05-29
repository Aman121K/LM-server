const db = require('../config/db');

// Create a new lead
exports.createLead = async (req, res) => {
    try {
        const {
            firstName,
            emailId,
            contactNumber,
            callStatus,
            followup,
            remarks,
            productName,
            unitType,
            budget,
            callBy
        } = req.body;

        const [result] = await db.execute(
            `INSERT INTO tblmaster (
                FirstName, EmailId, ContactNumber, callstatus, PostingDate, 
                followup, remarks, productname, unittype, budget, callby, submiton
            ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, CURDATE())`,
            [firstName, emailId, contactNumber, callStatus, followup, remarks, 
             productName, unitType, budget, callBy]
        );

        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all leads for a specific call status
exports.getLeadsByCallStatus = async (req, res) => {
    try {
        const { callStatus, callBy, startDate, endDate } = req.query;
        let query = 'SELECT * FROM tblmaster WHERE callby = ?';
        const params = [callBy];

        if (callStatus) {
            query += ' AND callstatus = ?';
            params.push(callStatus);
        }

        if (startDate && endDate) {
            query += ' AND followup BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += ' ORDER BY id DESC';

        const [leads] = await db.execute(query, params);
        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get lead by contact number
exports.getLeadByContact = async (req, res) => {
    try {
        const { contactNumber, callBy } = req.query;
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE ContactNumber = ? AND callby = ?',
            [contactNumber, callBy]
        );

        if (leads.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            data: leads[0]
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update a lead
exports.updateLead = async (req, res) => {
    try {
        const {
            firstName,
            emailId,
            contactNumber,
            callStatus,
            followup,
            remarks,
            productName,
            unitType,
            budget
        } = req.body;

        const [result] = await db.execute(
            `UPDATE tblmaster SET 
                FirstName = ?, 
                EmailId = ?, 
                ContactNumber = ?, 
                callstatus = ?, 
                PostingDate = CURDATE(),
                followup = ?, 
                remarks = ?, 
                productname = ?, 
                unittype = ?, 
                budget = ?,
                submiton = CURDATE()
            WHERE id = ?`,
            [firstName, emailId, contactNumber, callStatus, followup, remarks, 
             productName, unitType, budget, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { id: req.params.id, ...req.body }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete a lead
exports.deleteLead = async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM tblmaster WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get distinct call statuses for a user
exports.getCallStatuses = async (req, res) => {
    try {
        const { callBy } = req.query;
        const [statuses] = await db.execute(
            'SELECT DISTINCT callstatus FROM tblmaster WHERE callby = ? AND callstatus != ""',
            [callBy]
        );

        res.status(200).json({
            success: true,
            data: statuses.map(status => status.callstatus)
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all leads for a specific date range
exports.getLeadsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, callBy } = req.query;
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE followup BETWEEN ? AND ? AND callby = ? ORDER BY id DESC',
            [startDate, endDate, callBy]
        );

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get leads by product name
exports.getLeadsByProduct = async (req, res) => {
    try {
        const { productName, callBy } = req.query;
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE productname = ? AND callby = ? ORDER BY id DESC',
            [productName, callBy]
        );

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get leads by unit type
exports.getLeadsByUnitType = async (req, res) => {
    try {
        const { unitType, callBy } = req.query;
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE unittype = ? AND callby = ? ORDER BY id DESC',
            [unitType, callBy]
        );

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get leads by budget range
exports.getLeadsByBudget = async (req, res) => {
    try {
        const { minBudget, maxBudget, callBy } = req.query;
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE budget BETWEEN ? AND ? AND callby = ? ORDER BY id DESC',
            [minBudget, maxBudget, callBy]
        );

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 