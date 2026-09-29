const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// @desc    Make demo payment for a booking
// @route   POST /api/bookings/:id/pay
// @access  Private (Customer)
exports.payBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // RULE 1, RULE 4, RULE 5, RULE 6, RULE 7, RULE 9
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can initiate payment' });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    // RULE 2, RULE 10: Only completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only pay for completed bookings' });
    }

    // RULE 3, RULE 11: One successful demo payment
    const existingPayment = await Payment.findOne({ booking: booking._id, status: 'completed' });
    if (existingPayment) {
      return res.status(400).json({ success: false, message: 'Payment already completed for this booking' });
    }

    // RULE 7: Determine amount server-side
    // Using a fixed demo amount of $50 for simulation
    const amount = 50.00;

    // RULE 8: Generate transaction id
    const transactionId = `DEMO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // RULE 12, RULE 13: Create payment record
    const payment = await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      provider: booking.provider,
      amount,
      status: 'completed',
      transactionType: 'demo',
      transactionId
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    // Handle Mongoose duplicate key error safely
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Payment already completed for this booking' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
