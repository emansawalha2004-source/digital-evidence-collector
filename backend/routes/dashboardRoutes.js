const express = require('express');

const { getDashboard } = require('../controllers/dashboardController');
const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route لوحة التحكم العامة
router.get(
  '/',
  protect,
  requireRole('admin', 'investigator', 'viewer', 'auditor'),
  getDashboard
);

module.exports = router;