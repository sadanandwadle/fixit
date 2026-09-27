const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Helper to get day name from Date
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// @desc    Get current provider's weekly availability
// @route   GET /api/availability/me
// @access  Private (Provider only)
const getMyAvailability = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found',
      });
    }

    let schedules = await Availability.find({ providerId: provider._id }).sort({
      createdAt: 1,
    });

    // If no availability records exist yet, seed default standard week
    if (schedules.length === 0) {
      const defaultWeek = DAYS_OF_WEEK.map((day) => ({
        providerId: provider._id,
        day,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: day !== 'Sunday',
      }));
      schedules = await Availability.insertMany(defaultWeek);
    }

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current provider's weekly availability
// @route   PUT /api/availability/me
// @access  Private (Provider only)
const updateMyAvailability = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found',
      });
    }

    const { schedules } = req.body;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of daily schedules',
      });
    }

    // Validate schedules
    const seenDays = new Set();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    for (const item of schedules) {
      if (!DAYS_OF_WEEK.includes(item.day)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day of week: ${item.day}`,
        });
      }

      if (seenDays.has(item.day)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate day schedule provided for ${item.day}`,
        });
      }
      seenDays.add(item.day);

      if (item.isAvailable) {
        if (!timeRegex.test(item.startTime) || !timeRegex.test(item.endTime)) {
          return res.status(400).json({
            success: false,
            message: `Invalid time format for ${item.day}. Must be HH:MM in 24h format.`,
          });
        }

        // Check startTime < endTime
        if (item.startTime >= item.endTime) {
          return res.status(400).json({
            success: false,
            message: `Start time (${item.startTime}) must be earlier than end time (${item.endTime}) for ${item.day}`,
          });
        }
      } else {
        // Safe default fallback for disabled day
        if (!timeRegex.test(item.startTime)) item.startTime = '09:00';
        if (!timeRegex.test(item.endTime)) item.endTime = '18:00';
      }
    }

    // Upsert each schedule
    const operations = schedules.map((item) =>
      Availability.findOneAndUpdate(
        { providerId: provider._id, day: item.day },
        {
          providerId: provider._id,
          day: item.day,
          startTime: item.startTime,
          endTime: item.endTime,
          isAvailable: Boolean(item.isAvailable),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );

    await Promise.all(operations);

    const updatedList = await Availability.find({ providerId: provider._id });

    res.status(200).json({
      success: true,
      message: 'Weekly availability updated successfully',
      data: updatedList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider availability & booked slots (for customer booking view)
// @route   GET /api/availability/provider/:providerId
// @access  Public
const getProviderPublicAvailability = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { providerId } = req.params;
    if (!mongoose.isValidObjectId(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider identifier',
      });
    }

    let schedules = await Availability.find({ providerId });
    if (schedules.length === 0) {
      // Default: Monday through Saturday available 09:00 - 18:00
      schedules = DAYS_OF_WEEK.map((day) => ({
        day,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: day !== 'Sunday',
      }));
    }

    // Fetch active bookings for this provider over next 30 days to compute booked slots
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeBookings = await Booking.find({
      providerId,
      scheduledDate: { $gte: now, $lte: thirtyDaysLater },
      status: { $in: ['pending', 'accepted', 'confirmed', 'in-progress'] },
    }).select('scheduledDate scheduledTime status');

    const bookedSlots = activeBookings.map((b) => ({
      date: b.scheduledDate.toISOString().split('T')[0],
      time: b.scheduledTime,
      status: b.status,
    }));

    res.status(200).json({
      success: true,
      data: {
        schedules,
        bookedSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAvailability,
  updateMyAvailability,
  getProviderPublicAvailability,
  getDayName,
};
