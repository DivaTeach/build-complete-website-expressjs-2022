const mongoose = require('mongoose');
const crypto = require('crypto');

// Define subdocument schemas
const TwoFactorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  secret: String,
  backup_codes: [String]
}, { _id: false });

const SocialSchema = new mongoose.Schema({
  twitter: String,
  linkedin: String,
  github: String,
  facebook: String
}, { _id: false });

const ProfileSchema = new mongoose.Schema({
  first_name: { type: String, maxlength: 50 },
  last_name: { type: String, maxlength: 50 },
  display_name: String,
  bio: { type: String, maxlength: 500 },
  avatar: String,
  website: String,
  social: SocialSchema
}, { _id: false });

const NotificationsSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  frequency: { 
    type: String, 
    enum: ['immediate', 'daily', 'weekly'],
    default: 'immediate'
  }
}, { _id: false });

const EditorPreferencesSchema = new mongoose.Schema({
  editor_type: {
    type: String,
    enum: ['wysiwyg', 'markdown', 'html'],
    default: 'wysiwyg'
  },
  auto_save: { type: Boolean, default: true },
  spell_check: { type: Boolean, default: true }
}, { _id: false });

const SettingsSchema = new mongoose.Schema({
  theme: { type: String, default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  notifications: NotificationsSchema,
  editor_preferences: EditorPreferencesSchema
}, { _id: false });

const ActivitySchema = new mongoose.Schema({
  last_login: Date,
  last_active: Date,
  login_count: { type: Number, default: 0 },
  failed_login_attempts: { type: Number, default: 0 },
  last_failed_login: Date,
  password_changed_at: Date
}, { _id: false });

// Main User Schema
const UserSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    required: true,
    default: () => crypto.randomBytes(20).toString('hex')
  },
  
  // User identification
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true
  },
  
  // Authentication
  password_hash: {
    type: String,
    required: true,
    select: false // Don't include in queries by default
  },
  salt: {
    type: String,
    required: true,
    select: false
  },
  two_factor: TwoFactorSchema,
  
  // User role and permissions
  role: {
    type: String,
    required: true,
    enum: ['super_admin', 'admin', 'editor', 'author', 'contributor'],
    default: 'contributor',
    index: true
  },
  permissions: [String],
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending',
    index: true
  },
  
  // Profile information
  profile: ProfileSchema,
  
  // User preferences
  settings: SettingsSchema,
  
  // Activity tracking
  activity: ActivitySchema,
  
  // Email verification
  email_verified_at: Date,
  email_verification_token: String

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'users'
});

// Indexes
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ 'activity.last_login': -1 });
UserSchema.index({ email_verified_at: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  if (this.profile.first_name && this.profile.last_name) {
    return `${this.profile.first_name} ${this.profile.last_name}`;
  }
  return this.profile.display_name || this.username;
});

// Virtual for display name
UserSchema.virtual('displayName').get(function() {
  return this.profile.display_name || this.fullName || this.username;
});

// Instance methods
UserSchema.methods.updateLastLogin = function() {
  this.activity.last_login = new Date();
  this.activity.last_active = new Date();
  this.activity.login_count += 1;
  return this.save();
};

UserSchema.methods.updateActivity = function() {
  this.activity.last_active = new Date();
  return this.save();
};

UserSchema.methods.recordFailedLogin = function() {
  this.activity.failed_login_attempts += 1;
  this.activity.last_failed_login = new Date();
  return this.save();
};

UserSchema.methods.resetFailedLogins = function() {
  this.activity.failed_login_attempts = 0;
  this.activity.last_failed_login = null;
  return this.save();
};

UserSchema.methods.verifyEmail = function() {
  this.email_verified_at = new Date();
  this.email_verification_token = null;
  if (this.status === 'pending') {
    this.status = 'active';
  }
  return this.save();
};

UserSchema.methods.suspend = function() {
  this.status = 'suspended';
  return this.save();
};

UserSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Static methods
UserSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

UserSchema.statics.findByRole = function(role) {
  return this.find({ role, status: { $ne: 'suspended' } });
};

UserSchema.statics.findAdmins = function() {
  return this.find({ 
    role: { $in: ['super_admin', 'admin'] },
    status: 'active'
  });
};

UserSchema.statics.findVerified = function() {
  return this.find({ 
    email_verified_at: { $ne: null },
    status: { $ne: 'suspended' }
  });
};

// Middleware
UserSchema.pre('save', function(next) {
  // Generate email verification token for new users
  if (this.isNew && !this.email_verification_token) {
    this.email_verification_token = crypto.randomBytes(32).toString('hex');
  }
  
  // Update password_changed_at when password changes
  if (this.isModified('password_hash') && !this.isNew) {
    this.activity.password_changed_at = new Date();
  }
  
  next();
});

module.exports = mongoose.model('User', UserSchema);