const mongoose = require('mongoose');

// Define validation subdocument schema
const ValidationSchema = new mongoose.Schema({
  required: { type: Boolean, default: false },
  min_length: Number,
  max_length: Number,
  pattern: String, // Regex pattern
  options: [mongoose.Schema.Types.Mixed] // Valid options for enum-type settings
}, { _id: false });

// Main Settings Schema
const SettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  type: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'object', 'array']
  },
  
  // Setting metadata
  category: {
    type: String,
    required: true,
    enum: ['general', 'seo', 'social', 'email', 'security', 'appearance', 'analytics', 'custom'],
    index: true
  },
  
  label: {
    type: String,
    required: true
  },
  
  description: String,
  
  default_value: mongoose.Schema.Types.Mixed,
  
  // Validation rules
  validation: ValidationSchema,
  
  // Access control
  access_level: {
    type: String,
    enum: ['public', 'admin', 'super_admin'],
    default: 'admin',
    index: true
  },
  
  editable: {
    type: Boolean,
    default: true
  },
  
  // Audit trail
  updated_by: {
    type: String,
    ref: 'User'
  }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'settings'
});

// Indexes
SettingsSchema.index({ category: 1 });
SettingsSchema.index({ access_level: 1, editable: 1 });

// Instance methods
SettingsSchema.methods.updateValue = function(newValue, userId) {
  this.value = newValue;
  this.updated_by = userId;
  return this.save();
};

SettingsSchema.methods.validateValue = function(value) {
  if (!this.validation) return true;
  
  const validation = this.validation;
  
  // Check required
  if (validation.required && (value === null || value === undefined || value === '')) {
    return false;
  }
  
  // Check type-specific validations
  if (this.type === 'string' && typeof value === 'string') {
    if (validation.min_length && value.length < validation.min_length) return false;
    if (validation.max_length && value.length > validation.max_length) return false;
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) return false;
  }
  
  // Check enum options
  if (validation.options && validation.options.length > 0) {
    if (!validation.options.includes(value)) return false;
  }
  
  return true;
};

SettingsSchema.methods.resetToDefault = function() {
  if (this.default_value !== undefined) {
    this.value = this.default_value;
  }
  return this.save();
};

// Static methods
SettingsSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ label: 1 });
};

SettingsSchema.statics.findEditable = function() {
  return this.find({ editable: true }).sort({ category: 1, label: 1 });
};

SettingsSchema.statics.findByAccessLevel = function(accessLevel) {
  const levels = {
    'public': ['public'],
    'admin': ['public', 'admin'],
    'super_admin': ['public', 'admin', 'super_admin']
  };
  
  return this.find({ 
    access_level: { $in: levels[accessLevel] || ['public'] }
  }).sort({ category: 1, label: 1 });
};

SettingsSchema.statics.getSetting = function(key) {
  return this.findOne({ key }).then(setting => {
    return setting ? setting.value : null;
  });
};

SettingsSchema.statics.setSetting = function(key, value, userId) {
  return this.findOneAndUpdate(
    { key },
    { 
      value,
      updated_by: userId,
      updated_at: new Date()
    },
    { new: true, upsert: false }
  );
};

SettingsSchema.statics.getPublicSettings = function() {
  return this.find({ access_level: 'public' })
    .select('key value type category label')
    .lean();
};

SettingsSchema.statics.initializeDefaults = function() {
  const defaultSettings = [
    {
      key: 'site_title',
      value: 'My Website',
      type: 'string',
      category: 'general',
      label: 'Site Title',
      description: 'The main title of your website',
      validation: { required: true, max_length: 100 },
      access_level: 'admin'
    },
    {
      key: 'site_description',
      value: 'A great website built with Express.js',
      type: 'string',
      category: 'general',
      label: 'Site Description',
      description: 'A brief description of your website',
      validation: { max_length: 160 },
      access_level: 'admin'
    },
    {
      key: 'default_meta_description',
      value: 'Welcome to our website',
      type: 'string',
      category: 'seo',
      label: 'Default Meta Description',
      description: 'Default meta description for pages without custom descriptions',
      validation: { max_length: 160 },
      access_level: 'admin'
    },
    {
      key: 'posts_per_page',
      value: 10,
      type: 'number',
      category: 'general',
      label: 'Posts per Page',
      description: 'Number of posts to display per page',
      validation: { required: true },
      access_level: 'admin',
      default_value: 10
    },
    {
      key: 'enable_comments',
      value: true,
      type: 'boolean',
      category: 'general',
      label: 'Enable Comments',
      description: 'Allow comments on blog posts',
      access_level: 'admin',
      default_value: true
    },
    {
      key: 'smtp_settings',
      value: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      },
      type: 'object',
      category: 'email',
      label: 'SMTP Settings',
      description: 'Email server configuration',
      access_level: 'super_admin'
    }
  ];

  // Insert default settings if they don't exist
  return Promise.all(
    defaultSettings.map(setting => 
      this.updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      )
    )
  );
};

// Middleware
SettingsSchema.pre('save', function(next) {
  // Validate the value before saving
  if (!this.validateValue(this.value)) {
    return next(new Error(`Invalid value for setting ${this.key}`));
  }
  next();
});

module.exports = mongoose.model('Settings', SettingsSchema);