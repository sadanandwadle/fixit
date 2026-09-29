const express = require('express');
const router = express.Router();

const auth = require('./auth');
const services = require('./services');
const providers = require('./providers');
const bookings = require('./bookings');
const reviews = require('./reviews');
const notifications = require('./notifications');
const admin = require('./admin');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'FIXIT API is running correctly.' });
});

router.use('/auth', auth);
router.use('/services', services);
router.use('/providers', providers);
router.use('/bookings', bookings);
router.use('/reviews', reviews);
router.use('/notifications', notifications);
router.use('/admin', admin);

module.exports = router;
