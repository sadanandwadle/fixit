const mongoose = require('mongoose');

const bookingStatuses = [
  'pending',
  'accepted',
  'confirmed',
  'in-progress',
  'completed',
  'rejected',
  'cancelled',
];

const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: bookingStatuses,
      default: 'pending',
    },
    otp: {
      type: String,
      default: '',
    },
    otpHash: {
      type: String,
      default: '',
      select: false, // Never expose hashed secret in regular queries
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpVerifiedAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index to support fast double booking checks
bookingSchema.index({ providerId: 1, scheduledDate: 1, scheduledTime: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.bookingStatuses = bookingStatuses;
