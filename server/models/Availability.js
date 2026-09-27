const mongoose = require('mongoose');

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const availabilitySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    day: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: {
        values: daysOfWeek,
        message: '{VALUE} is not a valid day of the week',
      },
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'], // e.g. "09:00"
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'], // e.g. "18:00"
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:MM)'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Availability', availabilitySchema);
module.exports.daysOfWeek = daysOfWeek;
