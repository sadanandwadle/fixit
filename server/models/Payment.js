const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // A booking can have only one successful demo payment
  },
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
  amount: {
    type: Number,
    required: [true, 'Please provide an amount']
  },
  status: {
    type: String,
    enum: ['completed'],
    default: 'completed'
  },
  transactionType: {
    type: String,
    default: 'demo'
  },
  transactionId: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
