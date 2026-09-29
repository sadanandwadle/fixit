const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String, // e.g., 'User', 'Provider', 'Service', 'Review'
    required: true
  },
  entityId: {
    type: mongoose.Schema.ObjectId
  },
  details: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
