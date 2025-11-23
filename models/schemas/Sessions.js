const mongoose = require('mongoose');

// Define device info subdocument schema
const DeviceInfoSchema = new mongoose.Schema({
  browser: String,
  os: String,
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  }
}, { _id: false });

// Main Sessions Schema
const SessionsSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  user_id: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  
  // Session data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Session metadata
  ip_address: {
    type: String,
    required: true
  },
  
  user_agent: {
    type: String,
    required: true
  },
  
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  last_accessed: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  
  // Security flags
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  
  device_info: DeviceInfoSchema

}, {
  timestamps: false, // We're handling timestamps manually
  collection: 'sessions'
});

// Compound indexes
SessionsSchema.index({ user_id: 1, is_active: 1 });
SessionsSchema.index({ user_id: 1, last_accessed: -1 });

// Instance methods
SessionsSchema.methods.touch = function() {
  this.last_accessed = new Date();
  return this.save();
};

SessionsSchema.methods.destroy = function() {
  this.is_active = false;
  return this.save();
};

SessionsSchema.methods.extend = function(additionalSeconds = 3600) {
  this.expires_at = new Date(Date.now() + additionalSeconds * 1000);
  this.last_accessed = new Date();
  return this.save();
};

SessionsSchema.methods.isExpired = function() {
  return this.expires_at < new Date();
};

SessionsSchema.methods.updateData = function(newData) {
  this.data = { ...this.data, ...newData };
  this.last_accessed = new Date();
  return this.save();
};

// Static methods
SessionsSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    user_id: userId,
    is_active: true,
    expires_at: { $gt: new Date() }
  }).sort({ last_accessed: -1 });
};

SessionsSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({
    session_id: sessionId,
    is_active: true,
    expires_at: { $gt: new Date() }
  });
};

SessionsSchema.statics.createSession = function(sessionData) {
  const {
    session_id,
    user_id,
    ip_address,
    user_agent,
    device_info = {},
    expires_in = 86400 // 24 hours default
  } = sessionData;

  const expires_at = new Date(Date.now() + expires_in * 1000);

  return this.create({
    session_id,
    user_id,
    ip_address,
    user_agent,
    device_info,
    expires_at,
    data: {}
  });
};

SessionsSchema.statics.destroyAllUserSessions = function(userId) {
  return this.updateMany(
    { user_id: userId, is_active: true },
    { is_active: false }
  );
};

SessionsSchema.statics.destroyExpiredSessions = function() {
  return this.deleteMany({
    expires_at: { $lt: new Date() }
  });
};

SessionsSchema.statics.getUserSessionCount = function(userId) {
  return this.countDocuments({
    user_id: userId,
    is_active: true,
    expires_at: { $gt: new Date() }
  });
};

SessionsSchema.statics.cleanupOldSessions = function(olderThanDays = 30) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    $or: [
      { expires_at: { $lt: new Date() } },
      { last_accessed: { $lt: cutoffDate }, is_active: false }
    ]
  });
};

// Middleware
SessionsSchema.pre('save', function(next) {
  // Ensure session doesn't exceed maximum lifetime
  const maxLifetime = 30 * 24 * 60 * 60 * 1000; // 30 days
  const maxExpiry = new Date(this.created_at.getTime() + maxLifetime);
  
  if (this.expires_at > maxExpiry) {
    this.expires_at = maxExpiry;
  }
  
  next();
});

// Virtual for session age
SessionsSchema.virtual('age').get(function() {
  return Date.now() - this.created_at.getTime();
});

// Virtual for time until expiry
SessionsSchema.virtual('timeUntilExpiry').get(function() {
  return this.expires_at.getTime() - Date.now();
});

// Virtual for session duration
SessionsSchema.virtual('duration').get(function() {
  return this.last_accessed.getTime() - this.created_at.getTime();
});

module.exports = mongoose.model('Sessions', SessionsSchema);