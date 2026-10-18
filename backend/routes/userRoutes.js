const express = require('express');
const { getUsers, getUserById, updateUserRole, updateUserStatus } = require('../controllers/userController');
const { protect, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/role', updateUserRole);
router.put('/:id/status', updateUserStatus);

module.exports = router;
