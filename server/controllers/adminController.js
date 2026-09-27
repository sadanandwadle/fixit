const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Service = require('../models/Service');
const { serviceCategories } = require('../models/Service');
const Notification = require('../models/Notification');
const createNotification = require('../utils/createNotification');

// ==========================================
// 1. DASHBOARD OVERVIEW & ANALYTICS
// ==========================================

// @desc    Get system-wide overview statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getAdminDashboardStats = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    // 1. User metrics
    const [totalUsers, customerCount, providerCount, adminCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    // 2. Provider verification metrics
    const [totalProviders, verifiedProviders, unverifiedProviders] = await Promise.all([
      Provider.countDocuments(),
      Provider.countDocuments({ isVerified: true }),
      Provider.countDocuments({ isVerified: false }),
    ]);

    // 3. Booking metrics
    const [
      totalBookings,
      pendingBookings,
      acceptedBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'accepted' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'in-progress' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.countDocuments({ status: 'rejected' }),
    ]);

    // 4. Payment metrics
    const paymentAggregates = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalRevenue = 0;
    const paymentsByStatus = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    paymentAggregates.forEach((item) => {
      if (paymentsByStatus[item._id]) {
        paymentsByStatus[item._id] = {
          count: item.count,
          amount: Number(item.totalAmount.toFixed(2)),
        };
      }
      if (item._id === 'paid') {
        totalRevenue = Number(item.totalAmount.toFixed(2));
      }
    });

    const totalPaymentsCount = await Payment.countDocuments();

    // 5. Service & Review metrics
    const [totalServices, activeServices, totalReviews, reviewAggregate] = await Promise.all([
      Service.countDocuments(),
      Service.countDocuments({ status: 'active' }),
      Review.countDocuments(),
      Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const averageRating =
      reviewAggregate.length > 0 && reviewAggregate[0].avgRating
        ? Number(reviewAggregate[0].avgRating.toFixed(2))
        : 0;

    // 6. Recent records (latest 5)
    const [recentBookings, recentPayments, recentUsers] = await Promise.all([
      Booking.find()
        .populate('customerId', 'name email phone')
        .populate({
          path: 'providerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'name email phone' },
        })
        .populate('serviceId', 'name category basePrice')
        .sort({ createdAt: -1 })
        .limit(5),
      Payment.find()
        .populate('customerId', 'name email')
        .populate('bookingId', 'scheduledDate scheduledTime status')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: customerCount,
          providers: providerCount,
          admins: adminCount,
        },
        providers: {
          total: totalProviders,
          verified: verifiedProviders,
          unverified: unverifiedProviders,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          accepted: acceptedBookings,
          confirmed: confirmedBookings,
          inProgress: inProgressBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          rejected: rejectedBookings,
        },
        payments: {
          totalRevenue,
          totalTransactions: totalPaymentsCount,
          byStatus: paymentsByStatus,
        },
        services: {
          total: totalServices,
          active: activeServices,
        },
        reviews: {
          total: totalReviews,
          averageRating,
        },
        recent: {
          bookings: recentBookings,
          payments: recentPayments,
          users: recentUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// @desc    Get all users with filtering and search
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAdminUsers = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline.' });
    }

    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role && ['customer', 'provider', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details with associated stats
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
const getAdminUserById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let providerProfile = null;
    let customerBookingsCount = 0;
    let providerBookingsCount = 0;

    if (user.role === 'provider') {
      providerProfile = await Provider.findOne({ userId: user._id }).populate('services');
      if (providerProfile) {
        providerBookingsCount = await Booking.countDocuments({ providerId: providerProfile._id });
      }
    } else if (user.role === 'customer') {
      customerBookingsCount = await Booking.countDocuments({ customerId: user._id });
    }

    const paymentsCount = await Payment.countDocuments({ customerId: user._id });

    res.status(200).json({
      success: true,
      data: {
        user,
        providerProfile,
        stats: {
          customerBookingsCount,
          providerBookingsCount,
          paymentsCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. PROVIDER MANAGEMENT & VERIFICATION
// ==========================================

// @desc    Get all providers for admin
// @route   GET /api/admin/providers
// @access  Private (Admin only)
const getAdminProviders = async (req, res, next) => {
  try {
    const { verified, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (verified === 'true') {
      filter.isVerified = true;
    } else if (verified === 'false') {
      filter.isVerified = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const userMatches = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { userId: { $in: userMatches.map((u) => u._id) } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [providers, total] = await Promise.all([
      Provider.find(filter)
        .populate('userId', 'name email phone profileImage address')
        .populate('services', 'name category basePrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Provider.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: providers.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single provider for admin
// @route   GET /api/admin/providers/:id
// @access  Private (Admin only)
const getAdminProviderById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID format' });
    }

    const provider = await Provider.findById(req.params.id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const bookingsCount = await Booking.countDocuments({ providerId: provider._id });
    const reviewsCount = await Review.countDocuments({ providerId: provider._id });

    res.status(200).json({
      success: true,
      data: provider,
      stats: {
        bookingsCount,
        reviewsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle or set provider verification status
// @route   PUT /api/admin/providers/:id/verify
// @access  Private (Admin only)
const toggleProviderVerification = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID format' });
    }

    const provider = await Provider.findById(req.params.id).populate('userId');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Determine target verification status
    let targetVerified;
    if (req.body.isVerified !== undefined) {
      targetVerified = Boolean(req.body.isVerified);
    } else {
      // Toggle
      targetVerified = !provider.isVerified;
    }

    provider.isVerified = targetVerified;
    await provider.save();

    // Send in-app notification to provider
    try {
      if (provider.userId) {
        const recipientId = provider.userId._id || provider.userId;
        await createNotification({
          recipientId,
          type: 'provider_verified',
          title: targetVerified ? 'Profile Verified!' : 'Verification Status Updated',
          message: targetVerified
            ? 'Congratulations! Your FIXIT service provider profile has been officially verified by the administrator.'
            : 'Your FIXIT provider verification status has been updated by the administrator.',
        });
      }
    } catch (notifErr) {
      console.error('[AdminController] Notification error on verification toggle:', notifErr.message);
    }

    const updated = await Provider.findById(provider._id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice');

    res.status(200).json({
      success: true,
      message: `Provider ${targetVerified ? 'verified' : 'unverified'} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. BOOKINGS INSPECTION & MANAGEMENT
// ==========================================

// @desc    Get all bookings across the platform
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
const getAdminBookings = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('customerId', 'name email phone')
        .populate({
          path: 'providerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'name email phone' },
        })
        .populate('serviceId', 'name category basePrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking full inspection details
// @route   GET /api/admin/bookings/:id
// @access  Private (Admin only)
const getAdminBookingById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone address')
      .populate({
        path: 'providerId',
        select: 'businessName userId rating totalReviews address',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate('serviceId', 'name category basePrice duration');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Associated payment and review
    const [payment, review] = await Promise.all([
      Payment.findOne({ bookingId: booking._id }),
      Review.findOne({ bookingId: booking._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        booking,
        payment,
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. REVIEW MODERATION & RATING RECALCULATION
// ==========================================

// @desc    Get all reviews across system
// @route   GET /api/admin/reviews
// @access  Private (Admin only)
const getAdminReviews = async (req, res, next) => {
  try {
    const { rating, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (rating && !isNaN(Number(rating))) {
      filter.rating = Number(rating);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customerId', 'name email profileImage')
        .populate({
          path: 'providerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'name' },
        })
        .populate({
          path: 'bookingId',
          select: 'scheduledDate serviceId status',
          populate: { path: 'serviceId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/moderate a review and dynamically recalculate provider rating
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin only)
const deleteAdminReview = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID format' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const providerId = review.providerId;

    // Delete review
    await Review.findByIdAndDelete(review._id);

    // CRITICAL: Recalculate provider average rating and total reviews
    const remainingReviews = await Review.find({ providerId });
    const totalReviews = remainingReviews.length;
    const sumRatings = remainingReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(2)) : 0;

    await Provider.findByIdAndUpdate(providerId, {
      rating: avgRating,
      totalReviews,
    });

    res.status(200).json({
      success: true,
      message: 'Review successfully removed and provider rating recalculated',
      providerStats: {
        providerId,
        rating: avgRating,
        totalReviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. PAYMENTS AUDIT & INSPECTION
// ==========================================

// @desc    Get all payments across platform
// @route   GET /api/admin/payments
// @access  Private (Admin only)
const getAdminPayments = async (req, res, next) => {
  try {
    const { status, method, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (method && method !== 'all') {
      filter.method = method;
    }

    if (search && search.trim()) {
      filter.transactionId = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('customerId', 'name email phone')
        .populate({
          path: 'providerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate({
          path: 'bookingId',
          select: 'scheduledDate scheduledTime serviceId status',
          populate: { path: 'serviceId', select: 'name category' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment inspection details
// @route   GET /api/admin/payments/:id
// @access  Private (Admin only)
const getAdminPaymentById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('customerId', 'name email phone address')
      .populate({
        path: 'providerId',
        select: 'businessName userId address',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .populate({
        path: 'bookingId',
        populate: { path: 'serviceId', select: 'name category basePrice' },
      });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. SERVICES CATALOG CRUD & SAFETY CHECKS
// ==========================================

// @desc    Get all services for admin with metadata
// @route   GET /api/admin/services
// @access  Private (Admin only)
const getAdminServices = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ category: 1, name: 1 });

    // Attach count of providers offering each service
    const servicesWithCounts = await Promise.all(
      services.map(async (svc) => {
        const providerCount = await Provider.countDocuments({ services: svc._id });
        const activeBookingsCount = await Booking.countDocuments({
          serviceId: svc._id,
          status: { $in: ['pending', 'accepted', 'confirmed', 'in-progress'] },
        });

        const sObj = svc.toObject();
        sObj.providerCount = providerCount;
        sObj.activeBookingsCount = activeBookingsCount;
        return sObj;
      })
    );

    res.status(200).json({
      success: true,
      count: servicesWithCounts.length,
      categories: serviceCategories,
      data: servicesWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new service
// @route   POST /api/admin/services
// @access  Private (Admin only)
const createAdminService = async (req, res, next) => {
  try {
    const { name, category, description, basePrice, icon, status } = req.body;

    if (!name || !category || basePrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and base price are required',
      });
    }

    if (!serviceCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${serviceCategories.join(', ')}`,
      });
    }

    const priceNum = Number(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Base price must be a non-negative number',
      });
    }

    // Check unique name
    const existing = await Service.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists',
      });
    }

    const service = await Service.create({
      name: name.trim(),
      category,
      description: description ? description.trim() : '',
      basePrice: priceNum,
      icon: icon ? icon.trim() : '',
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service
// @route   PUT /api/admin/services/:id
// @access  Private (Admin only)
const updateAdminService = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID format' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const { name, category, description, basePrice, icon, status } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'Service name cannot be empty' });
      }
      const existing = await Service.findOne({
        name: new RegExp(`^${name.trim()}$`, 'i'),
        _id: { $ne: service._id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Another service already has this name' });
      }
      service.name = name.trim();
    }

    if (category !== undefined) {
      if (!serviceCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${serviceCategories.join(', ')}`,
        });
      }
      service.category = category;
    }

    if (description !== undefined) {
      service.description = description.trim();
    }

    if (basePrice !== undefined) {
      const priceNum = Number(basePrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ success: false, message: 'Base price must be a non-negative number' });
      }
      service.basePrice = priceNum;
    }

    if (icon !== undefined) {
      service.icon = icon.trim();
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
      }
      service.status = status;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service safely with dependencies check
// @route   DELETE /api/admin/services/:id
// @access  Private (Admin only)
const deleteAdminService = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID format' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Safety check 1: Active bookings check
    const activeBookingsCount = await Booking.countDocuments({
      serviceId: service._id,
      status: { $in: ['pending', 'accepted', 'confirmed', 'in-progress'] },
    });

    if (activeBookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service: ${activeBookingsCount} active booking(s) exist for this service. You can set its status to 'inactive' instead.`,
      });
    }

    // Safety check 2: Remove reference from providers
    await Provider.updateMany(
      { services: service._id },
      { $pull: { services: service._id } }
    );

    // Delete the service
    await Service.findByIdAndDelete(service._id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully and removed from provider catalogs',
      data: { id: service._id, name: service.name },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. NOTIFICATIONS AUDIT
// ==========================================

// @desc    Get system notifications for audit
// @route   GET /api/admin/notifications
// @access  Private (Admin only)
const getAdminNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = {};

    if (type && type !== 'all') {
      filter.type = type;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('recipientId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getAdminUsers,
  getAdminUserById,
  getAdminProviders,
  getAdminProviderById,
  toggleProviderVerification,
  getAdminBookings,
  getAdminBookingById,
  getAdminReviews,
  deleteAdminReview,
  getAdminPayments,
  getAdminPaymentById,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminNotifications,
};
