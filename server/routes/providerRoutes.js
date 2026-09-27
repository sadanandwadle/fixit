const express = require('express');
const router = express.Router();
const {
  getProviders,
  getProviderById,
  getMyProviderProfile,
  updateMyProviderProfile,
  createMyProviderProfile,
  updateMyLocation,
  getNearbyProviders,
} = require('../controllers/providerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public listing
router.get('/', getProviders);

// Public geospatial search (MUST be defined before /:id)
router.get('/nearby', getNearbyProviders);

// Provider authenticated routes (placed BEFORE /:id to prevent route collision)
router.get('/me', protect, authorize('provider'), getMyProviderProfile);
router.put('/me', protect, authorize('provider'), updateMyProviderProfile);
router.put('/me/location', protect, authorize('provider'), updateMyLocation);
router.post('/me', protect, authorize('provider'), createMyProviderProfile);

// Public single profile
router.get('/:id', getProviderById);

module.exports = router;
