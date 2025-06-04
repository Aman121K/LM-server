const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Lead CRUD operations
router.post('/', leadController.createLead);
router.get('/', leadController.getLeadsByCallStatus);
router.get('/contact', leadController.getLeadByContact);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Additional lead queries
router.get('/call-statuses', leadController.getCallStatuses);
router.get('/date-range', leadController.getLeadsByDateRange);
router.get('/product', leadController.getLeadsByProduct);
router.get('/unit-type', leadController.getLeadsByUnitType);
router.get('/budget', leadController.getLeadsByBudget);
router.get('/allCallStatus', leadController.allCallStatus);
router.get('/', leadController.getFilteredLeads);
router.get('/allBudgetsList',leadController.allBugetsList);
router.get('/allUnitList',leadController.allUnitslist)

module.exports = router; 