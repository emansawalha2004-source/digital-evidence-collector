const express = require('express');

const {
  getTimeline,
  getEvidenceTimeline,
  getCaseTimeline,
} = require('../controllers/timelineController');

const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// كل Routes الـ timeline تحتاج مستخدم مصرح
router.use(protect);
router.use(requireRole('admin'));

router.get('/', getTimeline);
router.get('/evidence/:evidenceId', getEvidenceTimeline);
router.get('/case/:caseId', getCaseTimeline);

module.exports = router;