const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Availability = require('../models/Availability');
const createNotification = require('../utils/createNotification');

// Helper to sanitize and normalize address
const normalizeAddress = (addressInput) => {
  if (!addressInput) return null;
  if (typeof addressInput === 'string') {
    return {
      street: addressInput.trim(),
      city: 'Local',
      state: '',
      zipCode: '',
    };
  }
  return {
    street: addressInput.street ? addressInput.street.trim() : (addressInput.address || ''),
    city: addressInput.city ? addressInput.city.trim() : '',
    state: addressInput.state ? addressInput.state.trim() : '',
    zipCode: addressInput.zipCode ? addressInput.zipCode.trim() : '',
  };
};

// Helper to strip sensitive OTP information based on requester role
const sanitizeBookingForUser = (bookingDoc, requesterUserId, requesterRole) => {
  if (!bookingDoc) return null;
  const booking = bookingDoc.toObject ? bookingDoc.toObject() : { ...bookingDoc };

  // Never expose otpHash to any client
  delete booking.otpHash;

  const isCustomer =
    booking.customerId?._id?.toString() === requesterUserId.toString() ||
    booking.customerId?.toString() === requesterUserId.toString();

  // If customer: only show OTP when status is 'confirmed'
  if (isCustomer) {
    if (booking.status !== 'confirmed') {
      delete booking.otp;
    }
  } else {
    // Provider or any other viewer NEVER gets to see the customer's OTP!
    delete booking.otp;
  }

  return booking;
};

// @desc    Create a new booking (checks double-booking and availability)
// @route   POST /api/bookings
// @access  Private (Customer only)
const createBooking = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const {
      providerId,
      serviceId,
      address,
      scheduledDate,
      scheduledTime,
      price,
      description,
    } = req.body;

    // Validate presence of required fields
    if (!providerId || !serviceId || !address || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide providerId, serviceId, address, scheduledDate, and scheduledTime',
      });
    }

    if (!mongoose.isValidObjectId(providerId) || !mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider or service identifier format',
      });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    // Prevent provider from booking themselves
    if (provider.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Providers cannot book their own services',
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Parse date safely avoiding UTC midnight day shifts (BUG-07)
    let parsedDate;
    if (typeof scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate.trim())) {
      const [y, m, d] = scheduledDate.trim().split('-').map(Number);
      parsedDate = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      parsedDate = new Date(scheduledDate);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled date format',
      });
    }

    // Past date validation (BUG-03)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const scheduledMidnight = new Date(parsedDate);
    scheduledMidnight.setHours(0, 0, 0, 0);
    if (scheduledMidnight < todayMidnight) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date cannot be in the past. Please choose today or an upcoming date.',
      });
    }

    // Normalize scheduledTime format (BUG-05)
    const normalizedTime = String(scheduledTime)
      .trim()
      .replace(/\s*(am|pm)/i, (m) => ' ' + m.trim().toUpperCase());

    // Helper: convert 12h time string (e.g. 10:30 AM) to 24h (HH:MM)
    const to24Hour = (timeStr) => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let [_, hours, mins, modifier] = match;
      let h = parseInt(hours, 10);
      if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
      if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${mins}`;
    };

    // Check Provider Availability for that Day of Week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[parsedDate.getDay()];
    const daySchedule = await Availability.findOne({
      providerId: provider._id,
      day: dayName,
    });

    if (daySchedule && !daySchedule.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Provider is not available on ${dayName}s`,
      });
    }

    // Validate that requested time is within working hours (BUG-04)
    if (daySchedule && daySchedule.isAvailable) {
      const time24 = to24Hour(normalizedTime);
      if (time24 && (time24 < daySchedule.startTime || time24 > daySchedule.endTime)) {
        return res.status(400).json({
          success: false,
          message: `Selected time (${normalizedTime}) is outside provider working hours (${daySchedule.startTime} - ${daySchedule.endTime}) on ${dayName}s`,
        });
      }
    }

    // PREVENT DOUBLE BOOKING: Check if provider already has an active booking for this date & time
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const timeRegex = new RegExp(`^${normalizedTime.replace(/\s+/g, '\\s*')}$`, 'i');
    const conflictingBooking = await Booking.findOne({
      providerId: provider._id,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      scheduledTime: timeRegex,
      status: { $in: ['pending', 'accepted', 'confirmed', 'in-progress'] },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available',
      });
    }

    const bookingPrice = Number(price) > 0 ? Number(price) : service.basePrice;
    const normalizedAddress = normalizeAddress(address);
    if (!normalizedAddress || !normalizedAddress.street || !normalizedAddress.city) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid street address and city for the service',
      });
    }

    // Create Booking: explicitly set customerId from authenticated user token!
    const booking = await Booking.create({
      customerId: req.user._id,
      providerId,
      serviceId,
      address: normalizedAddress,
      scheduledDate: parsedDate,
      scheduledTime: normalizedTime,
      price: bookingPrice,
      description: description ? description.trim() : '',
      status: 'pending',
      paymentStatus: 'pending',
    });

    const populated = await Booking.findById(booking._id)
      .populate({
        path: 'providerId',
        select: 'businessName rating experience pricing serviceArea userId',
        populate: { path: 'userId', select: 'name phone email profileImage' },
      })
      .populate('serviceId', 'name category basePrice icon description')
      .populate('customerId', 'name phone email');

    // Notify provider of new booking request (Phase 5)
    try {
      const customerName = req.user.name || 'Customer';
      const serviceName = populated.serviceId?.name || service.name || 'Service';
      const formattedDate = new Date(parsedDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
      });
      await createNotification({
        recipientId: provider.userId,
        type: 'booking_created',
        title: 'New Booking Request',
        message: `${customerName} requested ${serviceName} for ${formattedDate} at ${normalizedTime}.`,
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on createBooking:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: sanitizeBookingForUser(populated, req.user._id, 'customer'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings belonging to authenticated customer
// @route   GET /api/bookings/my-bookings
// @access  Private (Customer only)
const getMyCustomerBookings = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { status } = req.query;
    const filter = { customerId: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate({
        path: 'providerId',
        select: 'businessName rating experience pricing serviceArea userId',
        populate: { path: 'userId', select: 'name phone email profileImage' },
      })
      .populate('serviceId', 'name category basePrice icon description')
      .sort({ scheduledDate: -1, createdAt: -1 });

    const sanitized = bookings.map((b) =>
      sanitizeBookingForUser(b, req.user._id, 'customer')
    );

    res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings belonging to authenticated provider
// @route   GET /api/bookings/provider
// @access  Private (Provider only)
const getMyProviderBookings = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found for this user account',
      });
    }

    const { status, date } = req.query;
    const filter = { providerId: provider._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await Booking.find(filter)
      .populate('customerId', 'name email phone profileImage address')
      .populate('serviceId', 'name category basePrice icon')
      .sort({ scheduledDate: 1, createdAt: -1 });

    // Sanitize: Provider never receives OTP!
    const sanitized = bookings.map((b) =>
      sanitizeBookingForUser(b, req.user._id, 'provider')
    );

    res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking by ID (only for customer, provider, or admin)
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'providerId',
        select: 'businessName rating experience pricing serviceArea userId',
        populate: { path: 'userId', select: 'name phone email profileImage' },
      })
      .populate('serviceId', 'name category basePrice icon description')
      .populate('customerId', 'name phone email profileImage');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
    let isProvider = false;

    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (provider && booking.providerId._id.toString() === provider._id.toString()) {
        isProvider = true;
      }
    }

    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: sanitizeBookingForUser(
        booking,
        req.user._id,
        isCustomer ? 'customer' : 'provider'
      ),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provider accepts a pending booking (pending -> accepted)
// @route   PUT /api/bookings/:id/accept
// @access  Private (Provider only)
const acceptBooking = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only accept bookings assigned to your provider profile',
      });
    }

    // State machine check: ONLY pending -> accepted
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking with current status '${booking.status}'. Only 'pending' bookings can be accepted.`,
      });
    }

    booking.status = 'accepted';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category basePrice icon')
      .populate('providerId', 'businessName rating');

    // Notify customer that booking is accepted (Phase 5)
    try {
      const providerName = updated.providerId?.businessName || req.user.name || 'The provider';
      const serviceName = updated.serviceId?.name || 'service';
      await createNotification({
        recipientId: updated.customerId._id || updated.customerId,
        type: 'booking_accepted',
        title: 'Booking Accepted',
        message: `${providerName} has accepted your ${serviceName} booking.`,
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on acceptBooking:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking successfully accepted',
      data: sanitizeBookingForUser(updated, req.user._id, 'provider'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer confirms booking and generates Service Verification OTP (accepted -> confirmed)
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Customer only)
const confirmBooking = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify ownership: customer who created booking
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only confirm bookings belonging to your account',
      });
    }

    // State machine check: ONLY accepted -> confirmed
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status '${booking.status}'. Only 'accepted' bookings can be confirmed.`,
      });
    }

    // Cryptographically secure 4-digit OTP generation
    const rawOtp = crypto.randomInt(1000, 9999).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);

    booking.status = 'confirmed';
    booking.otp = rawOtp;
    booking.otpHash = hashedOtp;
    booking.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    booking.otpAttempts = 0;
    booking.otpVerifiedAt = null;

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate({
        path: 'providerId',
        select: 'businessName rating experience pricing serviceArea userId',
        populate: { path: 'userId', select: 'name phone email profileImage' },
      })
      .populate('serviceId', 'name category basePrice icon description');

    // Notify provider and customer (Phase 5)
    try {
      const customerName = req.user.name || 'Customer';
      const serviceName = updated.serviceId?.name || 'Service';
      const formattedDate = new Date(booking.scheduledDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
      });
      const providerUserId = updated.providerId?.userId?._id || updated.providerId?.userId;

      // 1. Notify provider: booking_confirmed
      if (providerUserId) {
        await createNotification({
          recipientId: providerUserId,
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          message: `${customerName} confirmed the ${serviceName} booking for ${formattedDate} at ${booking.scheduledTime}.`,
          bookingId: booking._id,
        });
      }

      // 2. Notify customer: otp_generated (NEVER include raw OTP or hash)
      await createNotification({
        recipientId: booking.customerId,
        type: 'otp_generated',
        title: 'Service Verification OTP',
        message: 'Your service verification OTP has been generated. Open your booking to view the OTP.',
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on confirmBooking:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking confirmed! Service verification OTP generated.',
      data: sanitizeBookingForUser(updated, req.user._id, 'customer'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provider verifies customer OTP to start service (confirmed -> in-progress)
// @route   PUT /api/bookings/:id/verify-otp
// @access  Private (Provider only)
const verifyOtpAndStartService = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the customer service OTP',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const booking = await Booking.findById(req.params.id).select('+otpHash');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Ownership check
    if (booking.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only verify OTP for your assigned bookings',
      });
    }

    // State machine check: ONLY confirmed -> in-progress
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify OTP for booking with status '${booking.status}'. Status must be 'confirmed'.`,
      });
    }

    // Expiry check
    if (booking.otpExpiresAt && new Date() > booking.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Service OTP has expired. Please ask customer to regenerate or contact support.',
      });
    }

    // Max attempts check (e.g. 5 attempts)
    if (booking.otpAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum OTP verification attempts exceeded.',
      });
    }

    // Compare OTP
    const isMatch = await bcrypt.compare(String(otp).trim(), booking.otpHash || '');
    if (!isMatch) {
      booking.otpAttempts = (booking.otpAttempts || 0) + 1;
      await booking.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid service OTP',
      });
    }

    // Correct OTP verified! Transition to in-progress and mark OTP as used
    booking.status = 'in-progress';
    booking.otpVerifiedAt = new Date();
    booking.otp = ''; // Marked as used
    booking.otpHash = '';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category basePrice icon')
      .populate('providerId', 'businessName rating');

    // Notify customer that service has started (Phase 5)
    try {
      const providerName = updated.providerId?.businessName || req.user.name || 'The provider';
      const serviceName = updated.serviceId?.name || 'service';
      await createNotification({
        recipientId: updated.customerId._id || updated.customerId,
        type: 'service_started',
        title: 'Service Started',
        message: `${providerName} has verified the service OTP and started your ${serviceName} service.`,
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on verifyOtpAndStartService:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully! Service is now in-progress.',
      data: sanitizeBookingForUser(updated, req.user._id, 'provider'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provider marks service as completed (in-progress -> completed)
// @route   PUT /api/bookings/:id/complete
// @access  Private (Provider only)
const completeService = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Ownership check
    if (booking.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only complete bookings assigned to your profile',
      });
    }

    // State machine check: ONLY in-progress -> completed (Must have been OTP verified!)
    if (booking.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete service with status '${booking.status}'. Only 'in-progress' bookings can be marked completed.`,
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category basePrice icon')
      .populate('providerId', 'businessName rating');

    // Notify customer about completion and demo payment due (Phase 5)
    try {
      const serviceName = updated.serviceId?.name || 'service';
      const formattedPrice = `₹${booking.price.toLocaleString('en-IN')}`;

      // 1. service_completed
      await createNotification({
        recipientId: updated.customerId._id || updated.customerId,
        type: 'service_completed',
        title: 'Service Completed',
        message: `Your ${serviceName} service has been marked as completed. Payment is now available.`,
        bookingId: booking._id,
      });

      // 2. payment_due
      await createNotification({
        recipientId: updated.customerId._id || updated.customerId,
        type: 'payment_due',
        title: 'Payment Due',
        message: `Your ${serviceName} service is complete. Demo payment of ${formattedPrice} is now available.`,
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on completeService:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Service marked as completed successfully',
      data: sanitizeBookingForUser(updated, req.user._id, 'provider'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provider rejects a pending booking (pending -> rejected)
// @route   PUT /api/bookings/:id/reject
// @access  Private (Provider only)
const rejectBooking = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(403).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only reject bookings assigned to your provider profile',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject booking with current status '${booking.status}'. Only 'pending' bookings can be rejected.`,
      });
    }

    booking.status = 'rejected';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category basePrice icon')
      .populate('providerId', 'businessName rating');

    // Notify customer that booking is rejected (Phase 5)
    try {
      const providerName = updated.providerId?.businessName || req.user.name || 'The provider';
      const serviceName = updated.serviceId?.name || 'service';
      await createNotification({
        recipientId: updated.customerId._id || updated.customerId,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `${providerName} could not accept your ${serviceName} booking.`,
        bookingId: booking._id,
      });
    } catch (notifErr) {
      console.error('[BookingController] Notification error on rejectBooking:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking successfully rejected',
      data: sanitizeBookingForUser(updated, req.user._id, 'provider'),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer cancels their booking (pending -> cancelled, accepted -> cancelled)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Customer only)
const cancelBooking = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier format',
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only cancel bookings that belong to your account',
      });
    }

    if (booking.status !== 'pending' && booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status '${booking.status}'. Only pending or accepted bookings can be cancelled.`,
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('serviceId', 'name category basePrice icon')
      .populate({ path: 'providerId', select: 'businessName rating userId' });

    // Notify provider that customer cancelled the booking (Phase 5)
    try {
      const customerName = req.user.name || 'Customer';
      const serviceName = updated.serviceId?.name || 'service';
      const providerUserId = updated.providerId?.userId;
      if (providerUserId) {
        await createNotification({
          recipientId: providerUserId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `${customerName} cancelled the ${serviceName} booking.`,
          bookingId: booking._id,
        });
      }
    } catch (notifErr) {
      console.error('[BookingController] Notification error on cancelBooking:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking successfully cancelled',
      data: sanitizeBookingForUser(updated, req.user._id, 'customer'),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyCustomerBookings,
  getMyProviderBookings,
  getBookingById,
  acceptBooking,
  confirmBooking,
  verifyOtpAndStartService,
  completeService,
  rejectBooking,
  cancelBooking,
};
