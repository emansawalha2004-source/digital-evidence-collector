const express = require('express');

const {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  archiveCase,
  getCaseEvidence,
  getCaseTimeline,
  getCaseStats,
} = require('../controllers/caseController');

const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// كل Routes القضايا تحتاج مستخدم
router.use(protect);

router
  .route('/')
  .post(requireRole('investigator'), createCase)
  .get(getCases);

router
  .route('/:id')
  .get(getCaseById)
  .put(requireRole('admin', 'investigator'), updateCase)
  .delete(requireRole('admin', 'investigator'), archiveCase);

router.get('/:id/evidence', getCaseEvidence);
router.get('/:id/timeline', requireRole('admin'), getCaseTimeline);
router.get('/:id/stats', getCaseStats);

module.exports = router;