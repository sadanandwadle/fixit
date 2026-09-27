const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const createNotification = require('../utils/createNotification');

/**
 * Generate a unique, authoritative transaction ID in the format:
 * FIXIT-TXN-XXXXXXXX
 */
const generateTransactionId = async () => {
  let isUnique = false;
  let txnId = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    txnId = `FIXIT-TXN-${randomHex}`;
    const existing = await Payment.findOne({ transactionId: txnId });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  return txnId;
};

/**
 * Consistent, canonical Payment response formatter (Sections 8, 9, 10, 14, 15)
 */
const formatPaymentResponse = (payment) => {
  if (!payment) return null;
  const p = payment.toObject ? payment.toObject() : payment;

  const idStr = p._id ? p._id.toString() : p.id ? p.id.toString() : '';
  const bookingIdStr = p.bookingId?._id
    ? p.bookingId._id.toString()
    : p.bookingId
    ? p.bookingId.toString()
    : '';
  const customerIdStr = p.customerId?._id
    ? p.customerId._id.toString()
    : p.customerId
    ? p.customerId.toString()
    : '';
  const providerIdStr = p.providerId?._id
    ? p.providerId._id.toString()
    : p.providerId
    ? p.providerId.toString()
    : '';

  return {
    id: idStr,
    paymentId: idStr, // Backwards-compatible alias for existing tests and client code
    bookingId: bookingIdStr,
    customerId: customerIdStr,
    providerId: providerIdStr,
    amount: p.amount,
    currency: p.currency || 'INR',
    method: p.method,
    status: p.status, // Canonical: pending | processing | paid | failed | cancelled
    transactionId: p.status === 'paid' ? p.transactionId || null : null,
    paidAt: p.status === 'paid' ? p.paidAt || null : null,
    failureReason: p.status === 'failed' ? p.failureReason || '' : '',
    notes: p.notes || '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

// @desc    Initiate a demo payment for a completed booking
// @route   POST /api/payments/create
// @access  Private (Customer only)
const createPayment = async (req, res, next) => {
  try {
    const { bookingId, method } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a bookingId',
      });
    }

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify booking belongs to authenticated customer (Section 7, 24)
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only create payments for your own bookings',
      });
    }

    // Verify booking status is completed (Section 6, 7)
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot create payment for booking with status '${booking.status}'. Service must be marked completed before payment.`,
      });
    }

    // Duplicate Payment Prevention (Section 11, 13): Return 409 Conflict
    if (booking.paymentStatus === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'Payment for this booking has already been completed',
      });
    }

    const existingPaid = await Payment.findOne({ bookingId: booking._id, status: 'paid' });
    if (existingPaid) {
      if (booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid';
        await booking.save();
      }
      return res.status(409).json({
        success: false,
        message: 'Payment for this booking has already been completed',
      });
    }

    // Authoritative amount determination from backend (Section 8: NEVER trust client amount)
    const authoritativeAmount = booking.price;
    if (typeof authoritativeAmount !== 'number' || authoritativeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount. Cannot initiate payment for zero or negative amount.',
      });
    }

    const selectedMethod = ['upi', 'card', 'cash'].includes(method) ? method : 'upi';

    // State machine & Payment Retry (Section 4, 5):
    // Reuse existing 'pending' payment attempt if one exists.
    // If previous attempt was 'failed' or 'cancelled', do NOT mutate it; create a NEW pending attempt.
    let payment = await Payment.findOne({
      bookingId: booking._id,
      customerId: req.user._id,
      status: 'pending',
    });

    if (payment) {
      payment.amount = authoritativeAmount;
      payment.method = selectedMethod;
      await payment.save();
    } else {
      payment = await Payment.create({
        bookingId: booking._id,
        customerId: req.user._id,
        providerId: booking.providerId,
        amount: authoritativeAmount,
        currency: 'INR',
        method: selectedMethod,
        status: 'pending',
        paidAt: null,
        transactionId: undefined,
        notes: 'Simulated Demo Payment — No real money charged',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Demo payment record initialized',
      payment: formatPaymentResponse(payment),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process a simulated payment (UPI, Card, or Cash)
// @route   POST /api/payments/:paymentId/process
// @access  Private (Customer only)
const processPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { method, upiId, simulateFailure } = req.body;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Verify ownership (Section 24)
    if (payment.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this payment record',
      });
    }

    // Verify booking
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Associated booking not found',
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for booking with status '${booking.status}'. Service must be completed first.`,
      });
    }

    // State Machine Guards & Duplicate Processing Prevention (Sections 4, 12, 13):
    // Disallow invalid transitions: paid -> processing/paid, failed -> paid, cancelled -> paid
    if (payment.status === 'paid' || booking.paymentStatus === 'paid') {
      return res.status(409).json({
        success: false,
        message: 'This payment has already been completed and processed',
        transactionId: payment.transactionId,
      });
    }

    if (payment.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot process a finalized failed payment. Please create a new payment attempt.',
      });
    }

    if (payment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot process a cancelled payment. Please create a new payment attempt.',
      });
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status transition: Cannot process payment with status '${payment.status}'.`,
      });
    }

    // Validate payment method (Section 3: upi, card, cash only)
    const validMethods = ['upi', 'card', 'cash'];
    if (!method || !validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Supported demo methods: upi, card, cash',
      });
    }

    // Input validation for simulated UPI
    if (method === 'upi') {
      if (!upiId || typeof upiId !== 'string' || !upiId.includes('@') || upiId.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid demo UPI ID (e.g. username@upi)',
        });
      }
    }

    // SIMULATED FAILURE MECHANISM (Sections 4, 12)
    const isSimulatedFail =
      Boolean(simulateFailure) === true ||
      (method === 'upi' && (upiId.toLowerCase() === 'fail@upi' || upiId.toLowerCase().endsWith('.fail')));

    if (isSimulatedFail) {
      payment.method = method;
      payment.status = 'failed';
      payment.failureReason = 'Simulated payment authorization failed by user request';
      payment.paidAt = null;
      payment.transactionId = undefined;
      booking.paymentStatus = 'failed';

      await payment.save();
      await booking.save();

      // Notify customer that demo payment failed (Phase 5)
      try {
        await createNotification({
          recipientId: payment.customerId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'Your demo payment could not be completed. No real money was charged.',
          bookingId: payment.bookingId,
          paymentId: payment._id,
        });
      } catch (notifErr) {
        console.error('[PaymentController] Notification error on payment failure:', notifErr.message);
      }

      return res.status(400).json({
        success: false,
        message: 'Demo payment failed: Simulated authorization declined',
        payment: formatPaymentResponse(payment),
      });
    }

    // SIMULATED SUCCESSFUL PROCESSING (Sections 4, 12, 14, 15)
    const transactionId = await generateTransactionId();

    payment.method = method;
    payment.status = 'paid';
    payment.transactionId = transactionId;
    payment.paidAt = new Date();
    payment.failureReason = '';
    payment.notes = `Simulated Demo Payment via ${method.toUpperCase()} — No real money charged`;

    booking.paymentStatus = 'paid';

    await payment.save();
    await booking.save();

    // Notify customer and provider on payment success (Phase 5)
    try {
      const formattedAmount = `₹${payment.amount.toLocaleString('en-IN')}`;

      // 1. Customer notification
      await createNotification({
        recipientId: payment.customerId,
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your demo payment of ${formattedAmount} was successful.\nTransaction: ${payment.transactionId}`,
        bookingId: payment.bookingId,
        paymentId: payment._id,
      });

      // 2. Provider notification
      const providerDoc = await Provider.findById(payment.providerId);
      if (providerDoc && providerDoc.userId) {
        await createNotification({
          recipientId: providerDoc.userId,
          type: 'payment_success',
          title: 'Payment Received',
          message: `The customer completed the demo payment for your service.\nAmount: ${formattedAmount}`,
          bookingId: payment.bookingId,
          paymentId: payment._id,
        });
      }
    } catch (notifErr) {
      console.error('[PaymentController] Notification error on payment success:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Demo payment successful',
      payment: formatPaymentResponse(payment),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a pending demo payment
// @route   POST /api/payments/:paymentId/cancel
// @access  Private (Customer only)
const cancelPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Verify ownership
    if (payment.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this payment record',
      });
    }

    // State machine check: Only 'pending' can be cancelled
    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transition: Cannot cancel an already-paid payment',
      });
    }

    if (payment.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transition: Cannot cancel a finalized failed payment',
      });
    }

    if (payment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already cancelled',
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending payments can be cancelled. Current status is '${payment.status}'.`,
      });
    }

    payment.status = 'cancelled';
    payment.notes = 'Payment cancelled by customer';
    payment.paidAt = null;
    payment.transactionId = undefined;

    const booking = await Booking.findById(payment.bookingId);
    if (booking && booking.paymentStatus !== 'paid') {
      booking.paymentStatus = 'cancelled';
      await booking.save();
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      payment: formatPaymentResponse(payment),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment information for a specific booking
// @route   GET /api/payments/booking/:bookingId
// @access  Private (Customer owner, assigned Provider, or Admin)
const getPaymentByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Authorization check: Customer owner, assigned Provider, or Admin
    const isCustomer = booking.customerId.toString() === req.user._id.toString();
    let isProvider = false;

    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (provider && provider._id.toString() === booking.providerId.toString()) {
        isProvider = true;
      }
    }

    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view payment details for this booking',
      });
    }

    // Find the primary payment for this booking (prefer paid, otherwise latest)
    let payment = await Payment.findOne({ bookingId: booking._id, status: 'paid' });
    if (!payment) {
      payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return res.status(200).json({
        success: true,
        payment: null,
        bookingPaymentStatus: booking.paymentStatus,
        bookingPrice: booking.price,
      });
    }

    res.status(200).json({
      success: true,
      payment: formatPaymentResponse(payment),
      bookingPaymentStatus: booking.paymentStatus,
      bookingPrice: booking.price,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's simulated payment history
// @route   GET /api/payments/my-payments
// @access  Private (Customer only)
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ customerId: req.user._id })
      .populate({
        path: 'bookingId',
        select: 'scheduledDate scheduledTime address description status paymentStatus',
        populate: [
          { path: 'serviceId', select: 'name category icon' },
          { path: 'providerId', select: 'businessName' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments.map(formatPaymentResponse),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  processPayment,
  cancelPayment,
  getPaymentByBooking,
  getMyPayments,
};
