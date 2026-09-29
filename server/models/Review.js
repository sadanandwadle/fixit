const mongoose = require('mongoose');
const Provider = require('./Provider');

const ReviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // Prevent duplicate reviews for the same booking
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
  rating: {
    type: Number,
    required: [true, 'Please add a rating between 1 and 5'],
    min: 1,
    max: 5
  },
  comment: {
    type: String
  },
  isModerated: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Static method to get avg rating and save
ReviewSchema.statics.getAverageRating = async function (providerId) {
  const obj = await this.aggregate([
    {
      $match: { provider: providerId }
    },
    {
      $group: {
        _id: '$provider',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj[0]) {
      await Provider.findByIdAndUpdate(providerId, {
        rating: Math.round(obj[0].averageRating * 10) / 10,
        reviewCount: obj[0].reviewCount
      });
    } else {
      await Provider.findByIdAndUpdate(providerId, {
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
ReviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.provider);
});

// Call getAverageRating after remove
ReviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.provider);
});

module.exports = mongoose.model('Review', ReviewSchema);
