const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  seedServicesEndpoint,
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getServices);
router.post('/seed', seedServicesEndpoint);
router.get('/:id', getServiceById);
router.post('/', protect, authorize('admin'), createService);

module.exports = router;
