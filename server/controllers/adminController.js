const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Helper to log audit events
const logAudit = async (adminId, action, entityType, entityId, details) => {
  try {
    await AuditLog.create({
      admin: adminId,
      action,
      entityType,
      entityId,
      details
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      verifiedProviders,
      totalServices,
      activeServices,
      totalBookings,
      pendingBookings,
      completedBookings,
      totalPayments,
      totalReviews
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      Provider.countDocuments({ verified: true }),
      Service.countDocuments(),
      Service.countDocuments({ active: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),
      Payment.countDocuments({ status: 'successful' }),
      Review.countDocuments()
    ]);

    // Aggregate total payment amount
    const paymentSum = await Payment.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = paymentSum.length > 0 ? paymentSum[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, customers: totalCustomers, providers: totalProviders },
        providers: { verified: verifiedProviders, pending: totalProviders - verifiedProviders },
        services: { total: totalServices, active: activeServices },
        bookings: { total: totalBookings, pending: pendingBookings, completed: completedBookings },
        payments: { total: totalPayments, revenue: totalRevenue },
        reviews: { total: totalReviews }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'isActive status required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deactivating oneself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change own status' });
    }

    user.isActive = isActive;
    await user.save();

    await logAudit(req.user.id, isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', 'User', user._id, `Status changed to ${isActive}`);

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get providers
// @route   GET /api/admin/providers
// @access  Private/Admin
exports.getProviders = async (req, res, next) => {
  try {
    const providers = await Provider.find()
      .populate('user', 'name email isActive')
      .populate('services', 'name category')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update provider verification
// @route   PUT /api/admin/providers/:id/verify
// @access  Private/Admin
exports.updateProviderVerification = async (req, res, next) => {
  try {
    const { verified } = req.body;
    if (verified === undefined) {
      return res.status(400).json({ success: false, message: 'verified status required' });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.verified = verified;
    await provider.save();

    await logAudit(req.user.id, verified ? 'PROVIDER_VERIFIED' : 'PROVIDER_UNVERIFIED', 'Provider', provider._id, `Verification changed to ${verified}`);

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get services
// @route   GET /api/admin/services
// @access  Private/Admin
exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: services.length, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create service
// @route   POST /api/admin/services
// @access  Private/Admin
exports.createService = async (req, res, next) => {
  try {
    const { name, category, description, icon } = req.body;
    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required' });
    }

    const exists = await Service.findOne({ name });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Service with this name already exists' });
    }

    const service = await Service.create(req.body);
    await logAudit(req.user.id, 'SERVICE_CREATED', 'Service', service._id, `Created service: ${name}`);

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update service
// @route   PUT /api/admin/services/:id
// @access  Private/Admin
exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    let action = 'SERVICE_UPDATED';
    if (req.body.active !== undefined && req.body.active !== service.active) {
      action = req.body.active ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED';
    }

    await logAudit(req.user.id, action, 'Service', service._id, `Updated service: ${service.name}`);

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('customer', 'name email')
      .populate('provider', 'professionalName')
      .populate('service', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get reviews
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'name email')
      .populate('provider', 'professionalName')
      .populate('booking', 'status')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Moderate review
// @route   PUT /api/admin/reviews/:id/moderate
// @access  Private/Admin
exports.updateReviewModeration = async (req, res, next) => {
  try {
    const { isModerated } = req.body;
    if (isModerated === undefined) {
      return res.status(400).json({ success: false, message: 'isModerated status required' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.isModerated = isModerated;
    await review.save();

    await logAudit(req.user.id, 'REVIEW_MODERATED', 'Review', review._id, `Moderation status changed to ${isModerated}`);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get payments
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('customer', 'name email')
      .populate('provider', 'professionalName')
      .populate('booking', 'status')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
