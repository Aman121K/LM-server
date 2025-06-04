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
        const { callStatus, callby, startDate, endDate, ContactNumber } = req.query;
        console.log("Query params:", { callStatus, callby, startDate, endDate, ContactNumber });

        // Start with base query
        let query = 'SELECT * FROM tblmaster';
        const params = [];
        const conditions = [];

        // Add conditions based on parameters
        if (callby) {
            conditions.push('callby = ?');
            params.push(callby);
        }

        if (callStatus!=='All') {
            conditions.push('callstatus = ?');
            params.push(callStatus);
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
        const leadId = req.params.id;
        const {
            FirstName,
            LastName,
            EmailId,
            ContactNumber,
            callstatus,
            remarks,
            followup,
            productname,
            unittype,
            budget
        } = req.body;

        console.log("all edit params>>", {
            FirstName,
            LastName,
            EmailId,
            ContactNumber,
            callstatus,
            remarks,
            followup,
            productname,
            unittype,
            budget
        });

        // First check if lead exists
        const [existingLead] = await db.execute(
            'SELECT * FROM tblmaster WHERE id = ?',
            [leadId]
        );

        if (existingLead.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Build update query dynamically based on provided fields
        const updateFields = [];
        const params = [];

        if (FirstName !== undefined) {
            updateFields.push('FirstName = ?');
            params.push(FirstName);
        }

        if (LastName !== undefined) {
            updateFields.push('LastName = ?');
            params.push(LastName);
        }

        if (EmailId !== undefined) {
            updateFields.push('EmailId = ?');
            params.push(EmailId);
        }

        if (ContactNumber !== undefined) {
            updateFields.push('ContactNumber = ?');
            params.push(ContactNumber);
        }

        if (callstatus !== undefined) {
            updateFields.push('callstatus = ?');
            params.push(callstatus);
        }

        if (followup !== undefined) {
            updateFields.push('followup = ?');
            params.push(followup);
        }

        if (remarks !== undefined) {
            updateFields.push('remarks = ?');
            params.push(remarks);
        }

        if (productname !== undefined) {
            updateFields.push('productname = ?');
            params.push(productname);
        }

        if (unittype !== undefined) {
            updateFields.push('unittype = ?');
            params.push(unittype);
        }

        if (budget !== undefined) {
            updateFields.push('budget = ?');
            params.push(budget);
        }

        // Always update the submiton timestamp
        updateFields.push('submiton = CURDATE()');

        // Add the lead ID to params
        params.push(leadId);

        // Execute update query
        const [result] = await db.execute(
            `UPDATE tblmaster SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated lead
        const [updatedLead] = await db.execute(
            'SELECT * FROM tblmaster WHERE id = ?',
            [leadId]
        );

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            data: updatedLead[0]
        });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead'
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

exports.allCallStatus = async (req, res) => {
    try {
        const [callStatus] = await db.execute(
            'SELECT * FROM callStatus ORDER BY id DESC',
        );
        res.status(200).json({
            success: true,
            data: callStatus
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Get Filtered Leads
exports.getFilteredLeads = async (req, res) => {
    try {
        const { startDate, endDate, callStatus, callby } = req.query;

        // Build the query conditions
        let conditions = [];
        let params = [];

        if (startDate && endDate) {
            conditions.push('DATE(submiton) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (callStatus) {
            conditions.push('callstatus = ?');
            params.push(callStatus);
        }

        if (callby) {
            conditions.push('callby = ?');
            params.push(callby);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get filtered leads
        const [leads] = await db.execute(
            `SELECT * FROM tblmaster ${whereClause} ORDER BY submiton DESC`,
            params
        );

        // Get total count
        const [totalCount] = await db.execute(
            `SELECT COUNT(*) as total FROM tblmaster ${whereClause}`,
            params
        );

        res.status(200).json({
            success: true,
            data: {
                leads,
                total: totalCount[0].total,
                filters: {
                    startDate,
                    endDate,
                    callStatus,
                    callby
                }
            }
        });
    } catch (error) {
        console.error('Get filtered leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching filtered leads'
        });
    }
};

exports.allBugetsList = async (req, res) => {
    try {
        const [budgetList] = await db.execute(
            'SELECT * FROM Budget get order by id DESC',
        );
        res.status(200).json({
            success: true,
            data: budgetList
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}
exports.allUnitslist = async (req, res) => {
    try {
        const [allUnits] = await db.execute(
            'SELECT * FROM unitType order by id DESC',
        );
        res.status(200).json({
            success: true,
            data: allUnits
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}