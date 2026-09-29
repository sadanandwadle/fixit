const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.ObjectId,
    ref: 'Provider',
    required: true
  },
  service: {
    type: mongoose.Schema.ObjectId,
    ref: 'Service',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Please add a scheduled date']
  },
  scheduledTime: {
    type: String,
    required: [true, 'Please add a scheduled time']
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'confirmed', 'cancelled', 'in-progress', 'completed'],
    default: 'pending'
  },
  otp: {
    hash: { type: String, select: false },
    expiresAt: { type: Date, select: false },
    isVerified: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
