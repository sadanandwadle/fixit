const express = require('express');
const { getProviders, getProvider } = require('../controllers/providerController');
const router = express.Router();

router.route('/')
  .get(getProviders);

router.route('/:id')
  .get(getProvider);

module.exports = router;
