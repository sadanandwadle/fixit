const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');

// @desc    Get paginated notifications for current authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { page, limit, isRead } = req.query;
    const result = await notificationService.getUserNotifications(req.user._id, {
      page,
      limit,
      isRead,
    });

    res.status(200).json({
      success: true,
      notifications: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count for current authenticated user
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadNotificationCount = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const count = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { id } = req.params;
    const result = await notificationService.markNotificationAsRead(id, req.user._id);

    if (result.status !== 200) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification: result.notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user's notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const result = await notificationService.markAllNotificationsAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
};
