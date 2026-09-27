const mongoose = require('mongoose');

const paymentMethods = ['upi', 'card', 'cash'];
const paymentStatuses = ['pending', 'processing', 'paid', 'failed', 'cancelled'];

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Authoritative amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    method: {
      type: String,
      enum: {
        values: paymentMethods,
        message: '{VALUE} is not a supported demo payment method',
      },
      default: 'upi',
    },
    status: {
      type: String,
      enum: {
        values: paymentStatuses,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: 'Simulated Demo Payment — No real money charged',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast retrieval and uniqueness checks
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1, status: 1 });

// Track initial status upon document load for transition validation
paymentSchema.post('init', function () {
  this._initialStatus = this.status;
});

// Enforce Payment State Machine & Data Integrity (Sections 4, 9, 14, 15)
paymentSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('status')) {
    const fromStatus = this._initialStatus || this.status;
    const toStatus = this.status;

    if (['paid', 'failed', 'cancelled'].includes(fromStatus) && fromStatus !== toStatus) {
      return next(
        new Error(
          `Invalid payment status transition: Cannot change from finalized status '${fromStatus}' to '${toStatus}'`
        )
      );
    }

    if (fromStatus === 'processing' && !['paid', 'failed'].includes(toStatus)) {
      return next(
        new Error(
          `Invalid payment status transition: From 'processing', status can only become 'paid' or 'failed', not '${toStatus}'`
        )
      );
    }
  }

  // Section 14 & 15: paidAt and transactionId are only valid when status === 'paid'
  if (this.status !== 'paid') {
    this.paidAt = null;
    this.transactionId = undefined;
  } else if (!this.paidAt) {
    this.paidAt = new Date();
  }

  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.paymentMethods = paymentMethods;
module.exports.paymentStatuses = paymentStatuses;
