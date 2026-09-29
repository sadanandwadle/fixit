const express = require('express');
const { getProviders, getProvider, updateLocation } = require('../controllers/providerController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.route('/location')
  .put(protect, updateLocation);

router.route('/')
  .get(getProviders);

router.route('/:id')
  .get(getProvider);

module.exports = router;
