const express = require('express');
const router = express.Router();

const auth = require('./auth');
const services = require('./services');
const providers = require('./providers');
const bookings = require('./bookings');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'FIXIT API is running correctly.' });
});

router.use('/auth', auth);
router.use('/services', services);
router.use('/providers', providers);
router.use('/bookings', bookings);

module.exports = router;
