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

// كل Routes القضايا تحتاج مستخدم مسجل الدخول
router.use(protect);

// تعديل الصلاحية لتشمل المدير والمحقق معاً لإنشاء القضايا
router
  .route('/')
  .post(requireRole('admin', 'investigator'), createCase)
  .get(getCases);

router
  .route('/:id')
  .get(getCaseById)
  .put(requireRole('admin', 'investigator'), updateCase)
  .delete(requireRole('admin', 'investigator'), archiveCase);

router.get('/:id/evidence', getCaseEvidence);

// تعديل الصلاحية لجدول الزمني للقضية ليسمح للمدير والمحقق معاً
router.get('/:id/timeline', requireRole('admin', 'investigator'), getCaseTimeline);
router.get('/:id/stats', getCaseStats);

module.exports = router;
