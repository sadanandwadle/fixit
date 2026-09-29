const mongoose = require('mongoose');

const ProviderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  professionalName: {
    type: String,
    required: [true, 'Please add a professional/business name']
  },
  description: {
    type: String,
    required: [true, 'Please add a bio/description']
  },
  services: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Service'
  }],
  pricing: {
    type: String,
    default: 'Contact for pricing'
  },
  experience: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  availability: {
    type: String, // E.g., 'Mon-Fri 9AM-5PM'
    default: 'Flexible'
  },
  verified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Create 2dsphere index for location
ProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Provider', ProviderSchema);
