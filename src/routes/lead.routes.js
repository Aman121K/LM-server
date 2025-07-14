const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'importfile-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log("files come here>>")
        if (file.mimetype !== 'text/csv') {
            return cb(new Error('Only CSV files are allowed'));
        }
        cb(null, true);
    }
});

// Apply auth middleware to all routes
router.use(auth);

// Lead CRUD operations
router.post('/', leadController.createLead);
router.get('/', leadController.getLeadsByCallStatus);
router.get('/contact', leadController.getLeadByContact);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Additional lead queries

router.get('/call-statuses/:callBy?', leadController.getCallStatuses);
router.get('/products-name/:callBy?', leadController.getProductsNameByUser);
router.post('/date-range', leadController.getLeadsByDateRange);
router.get('/product', leadController.getLeadsByProduct);
router.get('/unit-type', leadController.getLeadsByUnitType);
router.get('/budget', leadController.getLeadsByBudget);
router.get('/allCallStatus', leadController.allCallStatus);
router.get('/', leadController.getFilteredLeads);
router.get('/allBudgetsList', leadController.allBugetsList);
router.get('/allUnitslist', leadController.allUnitslist);

// Combined dashboard data endpoint
router.post('/user-reports', leadController.getUserDashboardData);

// Import leads from Excel
router.post('/import', upload.single('importfile'), leadController.importLeads);

// Download sample CSV
router.get('/sample-csv', leadController.downloadSampleCSV);

// Search leads
router.post('/search', leadController.searchLeads);

router.get('/resale-seller', leadController.showAllResalesLeas);

module.exports = router; 