const Notification = require('../models/Notification');

exports.createNotification = async ({ recipient, type, title, message, relatedBooking }) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      relatedBooking
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
