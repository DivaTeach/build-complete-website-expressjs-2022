const mongoose = require('mongoose');
const crypto = require('crypto');

// Define subdocument schemas
const AuthorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true }
}, { _id: false });

const MetadataSchema = new mongoose.Schema({
  seo_title: { type: String, maxlength: 60 },
  seo_description: { type: String, maxlength: 160 },
  seo_keywords: [String],
  featured_image: String,
  og_image: String,
  canonical_url: String,
  robots: String,
  schema_markup: mongoose.Schema.Types.Mixed
}, { _id: false });

const BlogSpecificSchema = new mongoose.Schema({
  reading_time: Number,
  word_count: Number,
  comments_enabled: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  series: String,
  part_number: Number
}, { _id: false });

const PageSpecificSchema = new mongoose.Schema({
  template: String,
  menu_order: Number,
  parent_page: String,
  show_in_nav: { type: Boolean, default: true },
  custom_fields: mongoose.Schema.Types.Mixed
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  publish_at: Date,
  unpublish_at: Date,
  timezone: { type: String, default: 'UTC' }
}, { _id: false });

const VersionSchema = new mongoose.Schema({
  number: { type: Number, default: 1 },
  changelog: String,
  auto_save: mongoose.Schema.Types.Mixed
}, { _id: false });

const MetricsSchema = new mongoose.Schema({
  view_count: { type: Number, default: 0 },
  like_count: { type: Number, default: 0 },
  share_count: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  last_viewed: Date
}, { _id: false });

const TimestampsSchema = new mongoose.Schema({
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  published_at: Date,
  last_modified_by: String
}, { _id: false });

// Main Content Schema
const ContentSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    required: true,
    default: () => crypto.randomBytes(20).toString('hex')
  },
  
  // Content classification
  type: {
    type: String,
    required: true,
    enum: ['page', 'blog', 'service', 'product', 'custom'],
    index: true
  },
  
  // Basic content fields
  title: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 200,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },
  content: {
    type: String,
    required: function() { 
      return this.status === 'published'; 
    }
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  
  // Publishing information
  status: {
    type: String,
    required: true,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'protected'],
    default: 'public'
  },
  
  // Author information
  author: {
    type: AuthorSchema,
    required: true
  },
  
  // Categorization
  tags: {
    type: [String],
    index: true
  },
  categories: {
    type: [String],
    index: true
  },
  
  // SEO and metadata
  metadata: MetadataSchema,
  
  // Content-specific fields
  blog_specific: BlogSpecificSchema,
  page_specific: PageSpecificSchema,
  
  // Publishing schedule
  schedule: ScheduleSchema,
  
  // Version control
  version: VersionSchema,
  
  // Engagement metrics
  metrics: MetricsSchema,
  
  // Timestamps
  timestamps: TimestampsSchema

}, {
  timestamps: false, // We're handling timestamps manually
  collection: 'content'
});

// Indexes
ContentSchema.index({ type: 1, status: 1 });
ContentSchema.index({ status: 1, 'timestamps.published_at': -1 });
ContentSchema.index({ 'author.id': 1, 'timestamps.created_at': -1 });
ContentSchema.index({ type: 1, status: 1, 'timestamps.published_at': -1 });
ContentSchema.index({ type: 1, tags: 1, status: 1 });

// Text search index
ContentSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  tags: 'text'
});

// Middleware to update timestamps
ContentSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timestamps.created_at = new Date();
  }
  this.timestamps.updated_at = new Date();
  
  if (this.status === 'published' && !this.timestamps.published_at) {
    this.timestamps.published_at = new Date();
  }
  
  next();
});

// Virtual for URL generation
ContentSchema.virtual('url').get(function() {
  if (this.type === 'blog') {
    return `/blog/${this.slug}`;
  }
  return `/${this.slug}`;
});

// Instance methods
ContentSchema.methods.publish = function() {
  this.status = 'published';
  this.timestamps.published_at = new Date();
  return this.save();
};

ContentSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

ContentSchema.methods.incrementViews = function() {
  this.metrics.view_count += 1;
  this.metrics.last_viewed = new Date();
  return this.save();
};

// Static methods
ContentSchema.statics.findPublished = function() {
  return this.find({ status: 'published' })
    .sort({ 'timestamps.published_at': -1 });
};

ContentSchema.statics.findByType = function(type) {
  return this.find({ type, status: 'published' })
    .sort({ 'timestamps.published_at': -1 });
};

ContentSchema.statics.findFeatured = function() {
  return this.find({ 
    status: 'published',
    'blog_specific.featured': true 
  }).sort({ 'timestamps.published_at': -1 });
};

module.exports = mongoose.model('Content', ContentSchema);