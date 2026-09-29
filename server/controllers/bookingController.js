const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Service = require('../models/Service');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Customer)
exports.createBooking = async (req, res) => {
  try {
    // Only customers can create bookings
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can create bookings' });
    }

    const { providerId, serviceId, scheduledDate, scheduledTime, notes } = req.body;

    // Validate provider and service
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Verify provider offers the service
    if (!provider.services.includes(serviceId)) {
      return res.status(400).json({ success: false, message: 'Provider does not offer this service' });
    }

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ success: false, message: 'Scheduled date and time are required' });
    }

    // Create booking
    const booking = await Booking.create({
      customer: req.user._id,
      provider: providerId,
      service: serviceId,
      scheduledDate,
      scheduledTime,
      notes,
      status: 'pending'
    });

    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: provider.user,
      type: 'BOOKING_CREATED',
      title: 'New booking request',
      message: 'You have received a new booking request.',
      relatedBooking: booking._id
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get all bookings for logged in user
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'provider') {
      // Find provider profile for this user
      const provider = await Provider.findOne({ user: req.user._id });
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider profile not found' });
      }
      query.provider = provider._id;
    } else if (req.user.role === 'admin') {
      // Admins can see all bookings
    }

    const bookings = await Booking.find(query)
      .populate('service', 'name category icon')
      .populate({
        path: 'provider',
        select: 'professionalName',
        populate: { path: 'user', select: 'name' }
      })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('service', 'name category icon')
      .populate({
        path: 'provider',
        select: 'professionalName',
        populate: { path: 'user', select: 'name' }
      })
      .populate('customer', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check authorization
    let isAuthorized = false;
    if (req.user.role === 'admin') isAuthorized = true;
    if (req.user.role === 'customer' && booking.customer._id.toString() === req.user._id.toString()) isAuthorized = true;
    
    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ user: req.user._id });
      if (provider && booking.provider._id.toString() === provider._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this booking' });
    }

    // Attach payment and review status for frontend convenience
    const Payment = require('../models/Payment');
    const Review = require('../models/Review');
    
    let isPaid = false;
    let review = null;
    
    if (booking.status === 'completed') {
      const payment = await Payment.findOne({ booking: booking._id, status: 'completed' });
      if (payment) isPaid = true;

      review = await Review.findOne({ booking: booking._id });
    }

    // Convert booking to plain object so we can attach custom fields
    const bookingObj = booking.toObject();
    bookingObj.isPaid = isPaid;
    bookingObj.review = review;

    res.status(200).json({ success: true, data: bookingObj });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Accept booking
// @route   POST /api/bookings/:id/accept
// @access  Private (Provider)
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Not authorized' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only accept pending bookings' });
    }

    booking.status = 'accepted';
    await booking.save();

    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: booking.customer,
      type: 'BOOKING_ACCEPTED',
      title: 'Booking accepted',
      message: 'Your booking request has been accepted.',
      relatedBooking: booking._id
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Reject booking
// @route   POST /api/bookings/:id/reject
// @access  Private (Provider)
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Not authorized' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only reject pending bookings' });
    }

    booking.status = 'rejected';
    await booking.save();

    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: booking.customer,
      type: 'BOOKING_REJECTED',
      title: 'Booking rejected',
      message: 'Your booking request was rejected.',
      relatedBooking: booking._id
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Confirm booking
// @route   POST /api/bookings/:id/confirm
// @access  Private (Customer)
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user.role !== 'customer' || booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Can only confirm accepted bookings' });
    }

    // Generate secure 6-digit OTP
    const crypto = require('crypto');
    const otpCode = crypto.randomInt(100000, 999999).toString();
    
    // Hash OTP for storage
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpCode, salt);

    // OTP expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    booking.status = 'confirmed';
    booking.otp = {
      hash: hashedOtp,
      expiresAt: expiresAt,
      isVerified: false
    };
    
    await booking.save();

    const providerObj = await Provider.findById(booking.provider);
    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: providerObj.user,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking confirmed',
      message: 'The customer has confirmed the booking.',
      relatedBooking: booking._id
    });

    // Return the plaintext OTP ONCE in this response payload.
    // It will not be exposed in standard GET requests due to select: false in the model schema.
    res.status(200).json({ success: true, data: booking, otp: otpCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Cancel booking
// @route   POST /api/bookings/:id/cancel
// @access  Private (Customer or Provider)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    let isCustomer = false;
    let isProvider = false;

    if (req.user.role === 'customer' && booking.customer.toString() === req.user._id.toString()) {
      isCustomer = true;
    }
    
    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ user: req.user._id });
      if (provider && booking.provider.toString() === provider._id.toString()) {
        isProvider = true;
      }
    }

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // State machine logic
    if (isCustomer) {
      if (!['pending', 'accepted', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel booking from ${booking.status} state` });
      }
    }

    if (isProvider) {
      if (!['accepted', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel booking from ${booking.status} state` });
      }
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Verify OTP to start service
// @route   POST /api/bookings/:id/verify-otp
// @access  Private (Provider)
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'Please provide OTP' });

    // explicitly select otp since it's select: false in schema
    const booking = await Booking.findById(req.params.id).select('+otp.hash +otp.expiresAt +otp.isVerified');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Not authorized' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Can only verify OTP for confirmed bookings' });
    }

    if (!booking.otp || !booking.otp.hash) {
      return res.status(400).json({ success: false, message: 'OTP not generated for this booking' });
    }

    if (booking.otp.isVerified) {
      return res.status(400).json({ success: false, message: 'OTP already verified' });
    }

    if (new Date() > booking.otp.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(otp, booking.otp.hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    booking.status = 'in-progress';
    booking.otp.isVerified = true;
    await booking.save();

    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: booking.customer,
      type: 'SERVICE_STARTED',
      title: 'Service started',
      message: 'Your service has started.',
      relatedBooking: booking._id
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Complete booking
// @route   POST /api/bookings/:id/complete
// @access  Private (Provider)
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Not authorized' });

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider || booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Can only complete in-progress bookings' });
    }

    booking.status = 'completed';
    await booking.save();

    const { createNotification } = require('../services/notificationService');
    await createNotification({
      recipient: booking.customer,
      type: 'SERVICE_COMPLETED',
      title: 'Service completed',
      message: 'Your service has been completed.',
      relatedBooking: booking._id
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
