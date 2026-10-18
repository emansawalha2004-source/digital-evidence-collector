const express = require('express');
const { generateEvidenceReport, generateCaseReport, listReports, downloadReport } = require('../controllers/reportController');
const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);
router.use(requireRole('investigator'));

router.get('/', listReports);
router.post('/evidence/:id', generateEvidenceReport);
router.post('/case/:id', generateCaseReport);
router.get('/download/:filename', downloadReport);

module.exports = router;
