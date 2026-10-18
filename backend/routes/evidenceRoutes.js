const express = require('express');

const {
  createEvidence,
  uploadEvidence,
  getEvidence,
  getEvidenceStats,
  getArchivedEvidence,
  getEvidenceById,
  updateEvidence,
  archiveEvidence,
  restoreEvidence,
  addEvidenceNote,
  downloadEvidence,
  previewEvidence,
  verifyIntegrity,
} = require('../controllers/evidenceController');

const { protect, requireRole } = require('../middlewares/authMiddleware');

const {
  uploadEvidenceFile,
  handleMulterError,
} = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(requireRole('investigator'), createEvidence)
  .get(getEvidence);

router.post(
  '/upload',
  requireRole('investigator'),
  uploadEvidenceFile,
  handleMulterError,
  uploadEvidence
);

router.get('/stats', getEvidenceStats);
router.get('/archived', getArchivedEvidence);

router.get('/:id/download', downloadEvidence);
router.get('/:id/preview', previewEvidence);

router.post(
  '/:id/verify-integrity',
  requireRole('admin', 'investigator', 'auditor'),
  verifyIntegrity
);

router.put(
  '/:id/restore',
  requireRole('admin', 'investigator'),
  restoreEvidence
);

router.post(
  '/:id/notes',
  requireRole('admin', 'investigator'),
  addEvidenceNote
);

router
  .route('/:id')
  .get(getEvidenceById)
  .put(requireRole('admin', 'investigator'), updateEvidence)
  .delete(requireRole('admin', 'investigator'), archiveEvidence);

module.exports = router;