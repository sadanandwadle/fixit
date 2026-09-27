const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');

/**
 * Create a new database-backed in-app notification.
 * Handles validation, duplicate prevention (idempotency), and non-blocking safety.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.recipientId - User ID of notification recipient
 * @param {string} params.type - Controlled notification type
 * @param {string} params.title - Human-friendly title
 * @param {string} params.message - Descriptive message (no sensitive credentials/OTP)
 * @param {string|mongoose.Types.ObjectId} [params.bookingId] - Associated Booking ID
 * @param {string|mongoose.Types.ObjectId} [params.paymentId] - Associated Payment ID
 * @param {string|mongoose.Types.ObjectId} [params.reviewId] - Associated Review ID
 * @returns {Promise<Object|null>} The created or existing notification document, or null on handled failure
 */
const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  bookingId = null,
  paymentId = null,
  reviewId = null,
}) => {
  try {
    // 1. Validate required fields
    if (!recipientId || !type || !title || !message) {
      console.warn('[NotificationService] Missing required notification fields:', {
        hasRecipient: Boolean(recipientId),
        hasType: Boolean(type),
        hasTitle: Boolean(title),
        hasMessage: Boolean(message),
      });
      return null;
    }

    // 2. Validate recipient ID format
    if (!mongoose.isValidObjectId(recipientId)) {
      console.warn(`[NotificationService] Invalid recipientId format: ${recipientId}`);
      return null;
    }

    // 3. Validate notification type against canonical enum
    if (!NOTIFICATION_TYPES.includes(type)) {
      console.warn(`[NotificationService] Invalid notification type: ${type}`);
      return null;
    }

    // 4. Validate referenced ObjectId formats if present
    const validBookingId = bookingId && mongoose.isValidObjectId(bookingId) ? bookingId : null;
    const validPaymentId = paymentId && mongoose.isValidObjectId(paymentId) ? paymentId : null;
    const validReviewId = reviewId && mongoose.isValidObjectId(reviewId) ? reviewId : null;

    // 5. Duplicate Prevention / Idempotency Check (Section 28)
    // Avoid duplicate notifications caused by retries, re-renders, or re-processing
    const duplicateQuery = {
      recipientId,
      type,
    };

    if (validBookingId) {
      duplicateQuery.bookingId = validBookingId;
    }
    if (validPaymentId) {
      duplicateQuery.paymentId = validPaymentId;
    }
    if (validReviewId) {
      duplicateQuery.reviewId = validReviewId;
    }

    // Check if an identical notification already exists for this resource event
    if (validBookingId || validPaymentId || validReviewId) {
      const existing = await Notification.findOne(duplicateQuery);
      if (existing) {
        // Notification already generated for this exact lifecycle event
        return existing;
      }
    }

    // 6. Create notification document
    const notification = await Notification.create({
      recipientId,
      type,
      title: title.trim(),
      message: message.trim(),
      bookingId: validBookingId,
      paymentId: validPaymentId,
      reviewId: validReviewId,
      isRead: false,
      readAt: null,
    });

    return notification;
  } catch (error) {
    // Non-blocking: failure in notification subsystem MUST NOT break core business flow
    console.error('[NotificationService] Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Get paginated notifications for an authenticated user.
 */
const getUserNotifications = async (recipientId, { page = 1, limit = 20, isRead } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { recipientId };
  if (isRead !== undefined && isRead !== null && isRead !== '') {
    filter.isRead = isRead === 'true' || isRead === true;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('bookingId', 'status scheduledDate scheduledTime price')
      .populate('paymentId', 'amount status transactionId')
      .populate('reviewId', 'rating comment')
      .lean(),
    Notification.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limitNum) || 1;

  return {
    notifications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages,
    },
  };
};

/**
 * Get unread notification count for an authenticated user.
 */
const getUnreadCount = async (recipientId) => {
  return await Notification.countDocuments({
    recipientId,
    isRead: false,
  });
};

/**
 * Mark a single notification as read for the authenticated recipient.
 */
const markNotificationAsRead = async (notificationId, recipientId) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    return { status: 400, message: 'Invalid notification identifier format' };
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return { status: 404, message: 'Notification not found' };
  }

  // Strictly enforce notification ownership (Section 11 & 43)
  if (notification.recipientId.toString() !== recipientId.toString()) {
    return {
      status: 403,
      message: 'Forbidden: You do not have permission to modify this notification',
    };
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return { status: 200, notification };
};

/**
 * Mark all unread notifications as read for the authenticated recipient.
 */
const markAllNotificationsAsRead = async (recipientId) => {
  const now = new Date();
  const result = await Notification.updateMany(
    {
      recipientId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: now,
      },
    }
  );

  return {
    updatedCount: result.modifiedCount || 0,
  };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
