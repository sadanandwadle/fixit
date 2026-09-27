const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const createNotification = require('../utils/createNotification');

// @desc    Submit a review for a completed booking
// @route   POST /api/reviews
// @access  Private (Customer only)
const createReview = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { bookingId, rating, comment } = req.body;

    if (!bookingId || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingId, rating, and comment',
      });
    }

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier',
      });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (comment.trim().length < 3 || comment.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be between 3 and 1000 characters',
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify ownership
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only review bookings that you personally booked',
      });
    }

    // Can only review completed bookings!
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot review a booking with status '${booking.status}'. Only completed bookings can be reviewed.`,
      });
    }

    // Prevent duplicate review for the same booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'A review has already been submitted for this booking',
      });
    }

    // Create Review
    const review = await Review.create({
      bookingId,
      customerId: req.user._id,
      providerId: booking.providerId,
      rating: numericRating,
      comment: comment.trim(),
    });

    // Recalculate provider average rating and review count
    const allProviderReviews = await Review.find({ providerId: booking.providerId });
    const totalReviews = allProviderReviews.length;
    const sumRatings = allProviderReviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(2)) : 0;

    await Provider.findByIdAndUpdate(booking.providerId, {
      rating: avgRating,
      totalReviews,
    });

    const populatedReview = await Review.findById(review._id).populate(
      'customerId',
      'name profileImage'
    );

    // Notify provider of new review (Phase 5)
    try {
      const providerDoc = await Provider.findById(booking.providerId);
      const populatedBooking = await Booking.findById(bookingId).populate('serviceId', 'name');
      const customerName = req.user.name || 'A customer';
      const serviceName = populatedBooking?.serviceId?.name || 'service';

      if (providerDoc && providerDoc.userId) {
        await createNotification({
          recipientId: providerDoc.userId,
          type: 'review_received',
          title: 'New Review',
          message: `${customerName} left a ${numericRating}-star review for your ${serviceName} service.`,
          bookingId: booking._id,
          reviewId: review._id,
        });
      }
    } catch (notifErr) {
      console.error('[ReviewController] Notification error on createReview:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: populatedReview,
      providerStats: {
        rating: avgRating,
        totalReviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getProviderReviews = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { providerId } = req.params;
    if (!mongoose.isValidObjectId(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider identifier',
      });
    }

    const reviews = await Review.find({ providerId })
      .populate('customerId', 'name profileImage')
      .populate('bookingId', 'scheduledDate serviceId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if a booking already has a review
// @route   GET /api/reviews/booking/:bookingId
// @access  Private (Customer only)
const getBookingReview = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { bookingId } = req.params;
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking identifier',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify ownership: customer who created booking or provider assigned
    const isCustomer = booking.customerId.toString() === req.user._id.toString();
    let isProvider = false;
    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (provider && booking.providerId.toString() === provider._id.toString()) {
        isProvider = true;
      }
    }
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view review data for this booking',
      });
    }

    const review = await Review.findOne({ bookingId }).populate('customerId', 'name profileImage');

    res.status(200).json({
      success: true,
      hasReview: Boolean(review),
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getProviderReviews,
  getBookingReview,
};
