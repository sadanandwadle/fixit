const express = require('express');
const router = express.Router();
const {
  getMyAvailability,
  updateMyAvailability,
  getProviderPublicAvailability,
} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Provider-only endpoints
router.get('/me', protect, authorize('provider'), getMyAvailability);
router.put('/me', protect, authorize('provider'), updateMyAvailability);

// Public provider availability lookup
router.get('/provider/:providerId', getProviderPublicAvailability);

module.exports = router;
