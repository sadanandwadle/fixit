const express = require('express');
const {
  createBooking,
  getBookings,
  getBooking,
  acceptBooking,
  rejectBooking,
  confirmBooking,
  cancelBooking,
  verifyOtp,
  completeBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth'); // Ensure this imports correctly

const router = express.Router();

// Require auth for all booking routes
router.use(protect);

router.route('/')
  .post(createBooking)
  .get(getBookings);

router.route('/:id')
  .get(getBooking);

router.post('/:id/accept', acceptBooking);
router.post('/:id/reject', rejectBooking);
router.post('/:id/confirm', confirmBooking);
router.post('/:id/cancel', cancelBooking);
router.post('/:id/verify-otp', verifyOtp);
router.post('/:id/complete', completeBooking);

module.exports = router;
