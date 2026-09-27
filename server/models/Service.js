const mongoose = require('mongoose');

const serviceCategories = [
  'Electrician',
  'Plumber',
  'AC Technician',
  'Mechanic',
  'Cleaner',
  'Computer Repair',
  'Other',
];

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: {
        values: serviceCategories,
        message: '{VALUE} is not a valid category',
      },
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '', // Icon name or image URL
    },
    basePrice: {
      type: Number,
      required: [true, 'Please specify a base price'],
      min: [0, 'Base price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Service', serviceSchema);
module.exports.serviceCategories = serviceCategories;
