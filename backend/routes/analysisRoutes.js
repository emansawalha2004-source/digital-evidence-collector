const express = require('express');
const {
  analyzeTextInput,
  analyzeLinkInput,
  analyzeEvidenceById,
  getEvidenceAnalysisHistory,
} = require('../controllers/analysisController');
const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/text', requireRole('admin', 'investigator'), analyzeTextInput);
router.post('/link', requireRole('admin', 'investigator'), analyzeLinkInput);
router.post('/evidence/:id', requireRole('admin', 'investigator'), analyzeEvidenceById);
router.get('/evidence/:id/history', getEvidenceAnalysisHistory);

module.exports = router;
