const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');

// @desc    Create a review for a completed booking
// @route   POST /api/reviews
// @access  Private (Customer)
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ success: false, message: 'Please provide bookingId and rating' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
    }

    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can submit reviews' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this booking' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this booking' });
    }

    const review = await Review.create({
      booking: booking._id,
      customer: req.user._id,
      provider: booking.provider,
      rating: numericRating,
      comment
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Review already submitted for this booking' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
exports.getProviderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get a review by booking ID
// @route   GET /api/reviews/booking/:bookingId
// @access  Private
exports.getBookingReview = async (req, res) => {
  try {
    const review = await Review.findOne({ booking: req.params.bookingId })
      .populate('customer', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
