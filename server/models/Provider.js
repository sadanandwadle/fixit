const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Please provide a business or display name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
    },
    pricing: {
      hourlyRate: {
        type: Number,
        default: 0,
      },
      startingPrice: {
        type: Number,
        default: 0,
      },
    },
    serviceArea: [
      {
        type: String,
        trim: true,
      },
    ],
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    serviceRadius: {
      type: Number,
      default: 15,
      min: [1, 'Service radius must be at least 1 km'],
      max: [100, 'Service radius cannot exceed 100 km'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        verified: { type: Boolean, default: false },
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for nearby provider queries
providerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Provider', providerSchema);

