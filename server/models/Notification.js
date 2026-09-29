const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'BOOKING_CREATED',
      'BOOKING_ACCEPTED',
      'BOOKING_REJECTED',
      'BOOKING_CONFIRMED',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'PAYMENT_COMPLETED',
      'REVIEW_RECEIVED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedBooking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
