const db = require('../config/db');

// Create a new lead
exports.createLead = async (req, res) => {
    try {
        const {
            FirstName,
            LastName,
            EmailId,
            ContactNumber,
            callstatus,
            followup,
            remarks,
            productname,
            unittype,
            budget,
            callBy
            // callBy = 'default' // Provide a default value if not specified
        } = req.body;
        console.log("whole body>>", FirstName,
            LastName,
            EmailId,
            ContactNumber,
            callstatus,
            followup,
            remarks,
            productname,
            unittype,
            budget,
            callBy)
        const [result] = await db.execute(
            `INSERT INTO tblmaster (
                FirstName, LastName, EmailId, ContactNumber, callstatus, PostingDate, 
                followup, remarks, productname, unittype, budget, callby, submiton
            ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, CURDATE())`,
            [FirstName, LastName, EmailId, ContactNumber, callstatus, followup, remarks,
                productname, unittype, budget, callBy]
        );

        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all leads for a specific call status
// exports.getLeadsByCallStatus = async (req, res) => {
//     try {
//         const { callStatus, callby, startDate, endDate, ContactNumber, productName } = req.query;
//         console.log("Query params:", { callStatus, callby, startDate, endDate, ContactNumber, productName });

//         // Start with base query
//         let query = 'SELECT * FROM tblmaster';
//         const params = [];
//         const conditions = [];

//         // Add conditions based on parameters
//         if (callby) {
//             conditions.push('callby = ?');
//             params.push(callby);
//         }

//         if (callStatus !== 'All') {
//             conditions.push('callstatus = ?');
//             params.push(callStatus);
//         } else {
//             conditions.push('callstatus = ""');
//         }


//         if (productName) {

//             if (productName !== 'All') {
//                 conditions.push('productname = ?');
//                 params.push(productName);
//             }
//             else {
//                 // conditions.push('productname = ""');
//             }
//         }
//         // Add ContactNumber search with LIKE
//         if (ContactNumber) {
//             conditions.push('ContactNumber LIKE ?');
//             params.push(`%${ContactNumber}%`);
//         }

//         // Only add date condition if both startDate and endDate are provided
//         if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
//             conditions.push('DATE(createdAt) BETWEEN ? AND ?');
//             params.push(startDate, endDate);
//         }

//         // Add WHERE clause if there are any conditions
//         if (conditions.length > 0) {
//             query += ' WHERE ' + conditions.join(' AND ');
//         }

//         // Add order by
//         query += ' ORDER BY id DESC';

//         console.log("Final query:", query);
//         console.log("Query params:", params);

//         const [leads] = await db.execute(query, params);
//         console.log("Query results:", leads.length, "leads found");

//         res.status(200).json({
//             success: true,
//             data: leads
//         });
//     } catch (error) {
//         console.error("Error in getLeadsByCallStatus:", error);
//         res.status(400).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

exports.getLeadsByCallStatus = async (req, res) => {
    try {
        const { callStatus, callby, startDate, endDate, ContactNumber, productName } = req.query;
        console.log("Query params:", { callStatus, callby, startDate, endDate, ContactNumber, productName });

        // Start with base query, join with task_assign_history subquery
        let query = `
            SELECT 
                tm.*, 
                IFNULL(th.callDoneAt, '') AS lastCallDoneAt, 
                IFNULL(th.callDoneBy, '') AS lastCallDoneBy
            FROM tblmaster tm
            LEFT JOIN (
                SELECT t1.leadId, t1.callDoneAt, t1.callDoneBy
                FROM ssuqgpoy_dashboard_1.task_assign_history t1
                INNER JOIN (
                    SELECT leadId, MAX(callDoneAt) AS maxCallDate
                    FROM ssuqgpoy_dashboard_1.task_assign_history
                    WHERE callDoneAt IS NOT NULL
                    GROUP BY leadId
                ) t2 ON t1.leadId = t2.leadId AND t1.callDoneAt = t2.maxCallDate
            ) th ON tm.id = th.leadId
        `;

        const params = [];
        const conditions = [];

        // Add conditions based on filters
        if (callby) {
            conditions.push('tm.callby = ?');
            params.push(callby);
        }

        if (callStatus !== 'All') {
            conditions.push('tm.callstatus = ?');
            params.push(callStatus);
        } else {
            conditions.push('tm.callstatus = ""');
        }

        if (productName && productName !== 'All') {
            conditions.push('tm.productname = ?');
            params.push(productName);
        }

        if (ContactNumber) {
            conditions.push('tm.ContactNumber LIKE ?');
            params.push(`%${ContactNumber}%`);
        }

        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            conditions.push('DATE(tm.createdAt) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        // Add WHERE clause
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Order by latest
        query += ' ORDER BY tm.id DESC';

        console.log("Final query:", query);
        console.log("Query params:", params);

        // Execute query
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
// exports.updateLead = async (req, res) => {
//     try {
//         const leadId = req.params.id;
//         const {
//             FirstName,
//             LastName,
//             EmailId,
//             ContactNumber,
//             callstatus,
//             remarks,
//             followup,
//             productname,
//             unittype,
//             budget,
//             assignedTo
//         } = req.body;

//         // console.log("all edit params>>", {
//         //     FirstName,
//         //     LastName,
//         //     EmailId,
//         //     ContactNumber,
//         //     callstatus,
//         //     remarks,
//         //     followup,
//         //     productname,
//         //     unittype,
//         //     budget
//         // });

//         // First check if lead exists
//         const [existingLead] = await db.execute(
//             'SELECT * FROM tblmaster WHERE id = ?',
//             [leadId]
//         );

//         if (existingLead.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Lead not found'
//             });
//         }

//         // Get TL name from tbluser based on callby
//         const [userData] = await db.execute(
//             'SELECT tl_name FROM tblusers WHERE username = ?',
//             [existingLead[0].callby]
//         );

//         if (userData.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'User not found'
//             });
//         }

//         // Build update query dynamically based on provided fields
//         const updateFields = [];
//         const params = [];

//         if (FirstName !== undefined) {
//             updateFields.push('FirstName = ?');
//             params.push(FirstName);
//         }

//         if (LastName !== undefined) {
//             updateFields.push('LastName = ?');
//             params.push(LastName);
//         }

//         if (EmailId !== undefined) {
//             updateFields.push('EmailId = ?');
//             params.push(EmailId);
//         }

//         if (ContactNumber !== undefined) {
//             updateFields.push('ContactNumber = ?');
//             params.push(ContactNumber);
//         }

//         if (callstatus !== undefined) {
//             updateFields.push('callstatus = ?');
//             params.push(callstatus);
//         }

//         if (followup !== undefined) {
//             updateFields.push('followup = ?');
//             params.push(followup);
//         }

//         if (remarks !== undefined) {
//             updateFields.push('remarks = ?');
//             params.push(remarks);
//         }

//         if (productname !== undefined) {
//             updateFields.push('productname = ?');
//             params.push(productname);
//         }

//         if (unittype !== undefined) {
//             updateFields.push('unittype = ?');
//             params.push(unittype);
//         }

//         if (budget !== undefined) {
//             updateFields.push('budget = ?');
//             params.push(budget);
//         }

//         if (assignedTo) {
//             updateFields.push('callby = ?');
//             params.push(assignedTo);
//         }

//         // Always update the submiton timestamp and assign_tl
//         updateFields.push('submiton = CURDATE()');
//         updateFields.push('assign_tl = ?');
//         params.push(userData[0].tl_name);

//         // Add the lead ID to params
//         params.push(leadId);

//         // Execute update query
//         const [result] = await db.execute(
//             `UPDATE tblmaster SET ${updateFields.join(', ')} WHERE id = ?`,
//             params
//         );









//         // Get updated lead
//         const [updatedLead] = await db.execute(
//             'SELECT * FROM tblmaster WHERE id = ?',
//             [leadId]
//         );

//         res.status(200).json({
//             success: true,
//             message: 'Lead updated successfully',
//             data: updatedLead[0]
//         });
//     } catch (error) {
//         console.error('Update lead error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error updating lead'
//         });
//     }
// };
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
            budget,
            assignedTo
        } = req.body;

        // Check if lead exists
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

        // Get TL name from tblusers
        const [userData] = await db.execute(
            'SELECT tl_name FROM tblusers WHERE username = ?',
            [existingLead[0].callby]
        );

        if (userData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build update query
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
        if (assignedTo) {
            updateFields.push('callby = ?');
            params.push(assignedTo);
        }

        // Always update timestamp and assign_tl
        updateFields.push('submiton = CURDATE()');
        updateFields.push('assign_tl = ?');
        params.push(userData[0].tl_name);

        params.push(leadId);

        // Execute update
        const [result] = await db.execute(
            `UPDATE tblmaster SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Insert into task_assign_history
        await db.execute(
            `INSERT INTO ssuqgpoy_dashboard_1.task_assign_history
             (leadId, assignTo, assignFrom, createdAt, updatedAt, status, callDoneAt, callDoneBy)
             VALUES (?, ?, ?, NOW(), NOW(), ?, NOW(), ?)`,
            [
                leadId,
                assignedTo ? assignedTo : '',
                existingLead[0].callby,
                callstatus || 'updated',
                existingLead[0].callby,
            ]
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
        // Get callBy from either query parameter or URL path
        const callBy = req.query.callBy || req.params.callBy;

        if (!callBy) {
            return res.status(400).json({
                success: false,
                message: 'CallBy parameter is required'
            });
        }

        const [statuses] = await db.execute(
            'SELECT DISTINCT callstatus FROM tblmaster WHERE callby = ? AND callstatus != ""',
            [callBy]
        );

        // Transform the data to match the client-side format
        const formattedStatuses = statuses.map(status => ({
            name: status.callstatus
        }));

        res.status(200).json({
            success: true,
            data: formattedStatuses
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
exports.getProductsNameByUser = async (req, res) => {
    try {
        // Get callBy from either query parameter or URL path
        const callBy = req.query.callBy || req.params.callBy;

        if (!callBy) {
            return res.status(400).json({
                success: false,
                message: 'CallBy parameter is required'
            });
        }

        const [productname] = await db.execute(
            'SELECT DISTINCT productname FROM tblmaster WHERE callby = ?',
            [callBy]
        );

        // Transform the data to match the client-side format
        const formattedProductName = productname.map(status => ({
            name: status.productname
        }));

        res.status(200).json({
            success: true,
            data: formattedProductName
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
        const { date, callBy } = req.body;

        // Get leads for the date
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE submiton BETWEEN ? AND ? AND callby = ? ORDER BY id DESC',
            [date, date, callBy]
        );

        // Get call status counts
        const [callStatusCounts] = await db.execute(
            `SELECT callstatus, COUNT(*) as count 
             FROM tblmaster 
             WHERE submiton BETWEEN ? AND ? 
             AND callby = ? 
             AND callstatus != ""
             GROUP BY callstatus`,
            [date, date, callBy]
        );

        // Format the counts into a more readable object
        const statusCounts = callStatusCounts.reduce((acc, curr) => {
            acc[curr.callstatus] = curr.count;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                leads,
                statusCounts,
                totalLeads: leads.length
            }
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
        const { startDate, endDate, callStatus, callby, productname } = req.query;

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

        if (productname) {
            conditions.push('productname = ?');
            params.push(productname);
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

        console.log("totalCount>>", totalCount)

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

// Get database call status summary
exports.getDatabaseCallStatus = async (req, res) => {
    try {
        const { callBy } = req.query;

        // Get total data count
        const [totalData] = await db.execute(
            'SELECT COUNT(*) as TotalData FROM tblmaster WHERE callby = ?',
            [callBy]
        );

        // Get calling done count (where callstatus is not empty)
        const [callingDone] = await db.execute(
            'SELECT COUNT(*) as callingdone FROM tblmaster WHERE callby = ? AND callstatus != ""',
            [callBy]
        );

        // Get pending count (where callstatus is empty)
        const [pending] = await db.execute(
            'SELECT COUNT(*) as pending FROM tblmaster WHERE callby = ? AND callstatus = ""',
            [callBy]
        );

        // Get call status distribution
        const [callStatus] = await db.execute(
            `SELECT callstatus, COUNT(*) as tcount 
             FROM tblmaster 
             WHERE callby = ? AND callstatus != "" 
             GROUP BY callstatus`,
            [callBy]
        );

        res.status(200).json({
            success: true,
            data: {
                totalData: totalData[0].TotalData,
                callingDone: callingDone[0].callingdone,
                pending: pending[0].pending,
                callStatusDistribution: callStatus
            }
        });
    } catch (error) {
        console.error('Get database call status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching database call status'
        });
    }
};

// Get calling done records by date
exports.getCallingDoneByDate = async (req, res) => {
    try {
        const { callBy } = req.query;

        const [callingDoneByDate] = await db.execute(
            `SELECT 
                DATE(submiton) as submiton,
                COUNT(*) as sbcount
             FROM tblmaster 
             WHERE callby = ? AND callstatus != ""
             GROUP BY DATE(submiton)
             ORDER BY submiton DESC`,
            [callBy]
        );

        // Format dates to match your PHP output format (d-M-y)
        const formattedData = callingDoneByDate.map(record => ({
            submiton: new Date(record.submiton).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            }).replace(/ /g, '-'),
            sbcount: record.sbcount
        }));

        res.status(200).json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Get calling done by date error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calling done records'
        });
    }
};

// Get combined database summary and calling done records
exports.getUserDashboardData = async (req, res) => {
    try {
        const { callBy } = req.body;

        // Get total data count
        const [totalData] = await db.execute(
            'SELECT COUNT(*) as TotalData FROM tblmaster WHERE callby = ?',
            [callBy]
        );

        // Get calling done count (where callstatus is not empty)
        const [callingDone] = await db.execute(
            'SELECT COUNT(*) as callingdone FROM tblmaster WHERE callby = ? AND callstatus != ""',
            [callBy]
        );

        // Get pending count (where callstatus is empty)
        const [pending] = await db.execute(
            'SELECT COUNT(*) as pending FROM tblmaster WHERE callby = ? AND callstatus = ""',
            [callBy]
        );

        // Get call status distribution
        const [callStatus] = await db.execute(
            `SELECT callstatus, COUNT(*) as tcount 
             FROM tblmaster 
             WHERE callby = ? AND callstatus != "" 
             GROUP BY callstatus`,
            [callBy]
        );

        // Get calling done by date
        const [callingDoneByDate] = await db.execute(
            `SELECT 
                DATE(submiton) as submiton,
                COUNT(*) as sbcount
             FROM tblmaster 
             WHERE callby = ? AND callstatus != ""
             GROUP BY DATE(submiton)
             ORDER BY submiton DESC`,
            [callBy]
        );

        // Format dates to match your PHP output format (d-M-y)
        const formattedCallingDoneByDate = callingDoneByDate.map(record => ({
            submiton: new Date(record.submiton).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            }).replace(/ /g, '-'),
            sbcount: record.sbcount
        }));

        res.status(200).json({
            success: true,
            data: {
                databaseSummary: {
                    totalData: totalData[0].TotalData,
                    callingDone: callingDone[0].callingdone,
                    pending: pending[0].pending,
                    callStatusDistribution: callStatus
                },
                callingDoneByDate: formattedCallingDoneByDate
            }
        });
    } catch (error) {
        console.error('Get user dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user dashboard data'
        });
    }
};

// Import leads from Excel file
exports.importLeads = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a CSV file'
            });
        }

        const filePath = req.file.path;

        console.log("files path>>", filePath)
        const fs = require('fs');
        const csv = require('csv-parser');
        const results = [];
        console.log("files path csv-parser>>", csv)

        // Read CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        // Process and insert data
        const insertPromises = results.map(async (row) => {
            const {
                FirstName,
                LastName,
                EmailId,
                ContactNumber,
                callstatus,
                remarks,
                PostingDate,
                callby,
                submiton,
                productName,

            } = row;

            // Insert record
            const [result] = await db.execute(
                `INSERT INTO tblmaster (
                    FirstName, LastName, EmailId, ContactNumber, 
                    callstatus, remarks, PostingDate, callby, submiton,productname
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
                [
                    FirstName,
                    LastName,
                    EmailId,
                    ContactNumber,
                    callstatus,
                    remarks,
                    PostingDate,
                    callby,
                    submiton,
                    productName
                ]
            );

            return result;
        });

        await Promise.all(insertPromises);

        // Delete the uploaded file
        fs.unlinkSync(filePath);

        // Get the last 10 records for response
        const [recentLeads] = await db.execute(
            'SELECT FirstName, LastName, EmailId, ContactNumber, callstatus, remarks, PostingDate, callby, submiton FROM tblmaster ORDER BY id DESC LIMIT 10'
        );

        res.status(200).json({
            success: true,
            message: 'Data imported successfully',
            data: {
                importedCount: results.length,
                recentLeads: recentLeads
            }
        });
    } catch (error) {
        console.error('Import leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error importing leads'
        });
    }
};

// Download sample CSV file
exports.downloadSampleCSV = async (req, res) => {
    try {
        const sampleData = `FirstName,LastName,EmailId,ContactNumber,callstatus,remarks,PostingDate,callby,submiton
John,Smith,john.smith@gmail.com,9876543210,Resale - Buyer,Interested in 3BHK,2024-03-15,John,2024-03-15
Sarah,Johnson,sarah.j@gmail.com,8765432109,New Buyer,Looking for Villa,2024-03-15,John,2024-03-15
Michael,Brown,michael.b@gmail.com,7654321098,Resale - Seller,Has 2BHK to sell,2024-03-15,John,2024-03-15
Emma,Wilson,emma.w@gmail.com,6543210987,New Buyer,Interested in Apartment,2024-03-15,John,2024-03-15
David,Lee,david.l@gmail.com,5432109876,Resale - Buyer,Looking for 4BHK,2024-03-15,John,2024-03-15
Lisa,Anderson,lisa.a@gmail.com,4321098765,New Buyer,Interested in Plot,2024-03-15,John,2024-03-15
Robert,Taylor,robert.t@gmail.com,3210987654,Resale - Seller,Has Villa to sell,2024-03-15,John,2024-03-15
Jennifer,Thomas,jennifer.t@gmail.com,2109876543,New Buyer,Looking for Commercial,2024-03-15,John,2024-03-15
William,Jackson,william.j@gmail.com,1098765432,Resale - Buyer,Interested in 2BHK,2024-03-15,John,2024-03-15
Mary,White,mary.w@gmail.com,9876543211,New Buyer,Looking for Farmhouse,2024-03-15,John,2024-03-15`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sample-leads.csv');
        res.send(sampleData);
    } catch (error) {
        console.error('Download sample CSV error:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading sample file'
        });
    }
};

// Search leads by phone number and name
exports.searchLeads = async (req, res) => {
    try {
        const { contactNumber, name } = req.body;

        // Build the query conditions
        let conditions = [];
        let params = [];

        if (contactNumber) {
            conditions.push('ContactNumber LIKE ?');
            params.push(`%${contactNumber}%`);
        }

        if (name) {
            conditions.push('(FirstName LIKE ? OR LastName LIKE ?)');
            params.push(`%${name}%`, `%${name}%`);
        }

        // If no search parameters provided, return error
        if (conditions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either phone number or name to search'
            });
        }

        // Build the final query
        const query = `
            SELECT 
                id,
                FirstName,
                LastName,
                EmailId,
                ContactNumber,
                callstatus,
                remarks,
                PostingDate,
                followup,
                productname,
                unittype,
                budget,
                callby,
                submiton
            FROM tblmaster 
            WHERE ${conditions.join(' AND ')}
            ORDER BY id DESC
        `;

        const [leads] = await db.execute(query, params);

        res.status(200).json({
            success: true,
            data: {
                totalResults: leads.length,
                leads: leads
            }
        });
    } catch (error) {
        console.error('Search leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching leads'
        });
    }
};

exports.showAllResalesLeas = async (req, res) => {
    try {
        const [leads] = await db.execute(
            'SELECT * FROM tblmaster WHERE callstatus = ? ORDER BY id DESC',
            ['Resale - Seller']
        );

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error('Get resale seller leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching resale seller leads'
        });
    }
};

// Get daily call completion statistics by TL and users
exports.getDailyCallCompletionByTL = async (req, res) => {
    console.log("getDailyCallCompletionByTL>>", req.query);
    try {
        const { startDate, endDate } = req.query;

        // Build date condition
        let dateCondition = '';
        let params = [];
        
        if (startDate && endDate) {
            dateCondition = 'AND DATE(tah.callDoneAt) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Single optimized query to get all data at once
        const [allData] = await db.execute(
            `SELECT 
                DATE(tah.callDoneAt) as callDate,
                tl.FullName as tlName,
                tl.Username as tlUsername,
                u.FullName as userName,
                u.Username as userUsername,
                COUNT(*) as callCount
             FROM ssuqgpoy_dashboard_1.task_assign_history tah
             INNER JOIN tblusers u ON tah.callDoneBy = u.Username
             INNER JOIN tblusers tl ON u.tl_name = tl.Username
             WHERE tah.callDoneAt IS NOT NULL 
             AND tl.userType = 'tl'
             ${dateCondition}
             GROUP BY DATE(tah.callDoneAt), tl.Username, u.Username
             ORDER BY callDate DESC, tl.FullName, u.FullName`,
            params
        );

        // Process the data to organize by date, TL, and users
        const report = [];
        const dateMap = new Map();

        allData.forEach(record => {
            const date = new Date(record.callDate);
            const formattedDate = `${date.getDate()}/${date.toLocaleDateString('en-GB', { month: 'short' })}/${date.getFullYear()}`;
            
            // Initialize date entry if it doesn't exist
            if (!dateMap.has(formattedDate)) {
                dateMap.set(formattedDate, {
                    date: formattedDate,
                    tls: new Map()
                });
            }
            
            const dateEntry = dateMap.get(formattedDate);
            
            // Initialize TL entry if it doesn't exist
            if (!dateEntry.tls.has(record.tlUsername)) {
                dateEntry.tls.set(record.tlUsername, {
                    tlName: record.tlName,
                    tlUsername: record.tlUsername,
                    users: []
                });
            }
            
            const tlEntry = dateEntry.tls.get(record.tlUsername);
            
            // Add user data
            tlEntry.users.push({
                userName: record.userName,
                userUsername: record.userUsername,
                callCount: record.callCount
            });
        });

        // Convert Map to array format for response
        dateMap.forEach((dateEntry, formattedDate) => {
            const dateReport = {
                date: formattedDate,
                tls: []
            };
            
            dateEntry.tls.forEach((tlEntry, tlUsername) => {
                dateReport.tls.push(tlEntry);
            });
            
            report.push(dateReport);
        });

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get daily call completion by TL error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching daily call completion data by TL'
        });
    }
};


exports.getDataByCallStatusFromTlName = async (req, res) => {
    try {
        const { callStatus, tlName } = req.query;
        console.log("Query params:", { callStatus, tlName });

        if (!tlName) {
            return res.status(400).json({
                success: false,
                message: 'TL name is required'
            });
        }

        // First, get all users under this TL
        const [users] = await db.execute(
            'SELECT Username FROM tblusers WHERE tl_name = ?',
            [tlName]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No users found under this TL'
            });
        }

        const userUsernames = users.map(user => user.Username);

        // Build the main query
        let query = `
            SELECT 
                tm.*, 
                IFNULL(th.callDoneAt, '') AS lastCallDoneAt, 
                IFNULL(th.callDoneBy, '') AS lastCallDoneBy
            FROM tblmaster tm
            LEFT JOIN (
                SELECT t1.leadId, t1.callDoneAt, t1.callDoneBy
                FROM ssuqgpoy_dashboard_1.task_assign_history t1
                INNER JOIN (
                    SELECT leadId, MAX(callDoneAt) AS maxCallDate
                    FROM ssuqgpoy_dashboard_1.task_assign_history
                    WHERE callDoneAt IS NOT NULL
                    GROUP BY leadId
                ) t2 ON t1.leadId = t2.leadId AND t1.callDoneAt = t2.maxCallDate
            ) th ON tm.id = th.leadId
        `;

        const params = [];
        const conditions = [];

        // Add TL condition - get leads from users under this TL
        conditions.push('tm.callby IN (' + userUsernames.map(() => '?').join(',') + ')');
        params.push(...userUsernames);

        // Add call status condition
        if (callStatus && callStatus !== 'All') {
            conditions.push('tm.callstatus = ?');
            params.push(callStatus);
        } else if (callStatus === 'All') {
            // For 'All', include all call statuses
            // No condition needed
        } else {
            // Default: show only leads with empty call status
            conditions.push('tm.callstatus = ""');
        }

        // Add WHERE clause
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Order by latest
        query += ' ORDER BY tm.id DESC';

        console.log("Final query:", query);
        console.log("Query params:", params);

        // Execute query
        const [leads] = await db.execute(query, params);
        console.log("Query results:", leads.length, "leads found");

        res.status(200).json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error("Error in getDataByCallStatusFromTlName:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};