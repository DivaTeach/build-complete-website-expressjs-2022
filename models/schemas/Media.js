const mongoose = require('mongoose');
const crypto = require('crypto');

// Define image metadata subdocument schema
const ImageMetadataSchema = new mongoose.Schema({
  width: Number,
  height: Number,
  alt_text: String,
  caption: String,
  exif_data: mongoose.Schema.Types.Mixed // EXIF data for photos
}, { _id: false });

// Define usage tracking subdocument schema
const UsageSchema = new mongoose.Schema({
  content_id: {
    type: String,
    ref: 'Content'
  },
  usage_type: {
    type: String,
    enum: ['featured_image', 'inline', 'attachment', 'gallery', 'thumbnail'],
    required: true
  }
}, { _id: false });

// Define thumbnail subdocument schema
const ThumbnailSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'xlarge'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  file_size: Number
}, { _id: false });

// Define processing subdocument schema
const ProcessingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  thumbnails: [ThumbnailSchema],
  error_message: String,
  processed_at: Date
}, { _id: false });

// Main Media Schema
const MediaSchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    required: true,
    default: () => crypto.randomBytes(20).toString('hex')
  },
  
  // File identification
  filename: {
    type: String,
    required: true
  },
  
  original_filename: {
    type: String,
    required: true
  },
  
  file_path: {
    type: String,
    required: true,
    unique: true
  },
  
  url: {
    type: String,
    required: true
  },
  
  // File information
  file_size: {
    type: Number,
    required: true,
    min: 0
  },
  
  mime_type: {
    type: String,
    required: true,
    index: true
  },
  
  file_extension: {
    type: String,
    required: true,
    lowercase: true
  },
  
  // Image-specific metadata
  image_metadata: ImageMetadataSchema,
  
  // Organization
  folder: {
    type: String,
    default: 'uploads',
    index: true
  },
  
  tags: {
    type: [String],
    index: true
  },
  
  // Usage tracking
  used_in: [UsageSchema],
  
  // Upload information
  uploaded_by: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  
  uploaded_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Processing status
  processing: ProcessingSchema,
  
  // SEO and accessibility
  seo: {
    alt_text: String,
    title: String,
    description: String
  },
  
  // Usage statistics
  stats: {
    download_count: { type: Number, default: 0 },
    view_count: { type: Number, default: 0 },
    last_accessed: Date
  }

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'media'
});

// Indexes
MediaSchema.index({ uploaded_by: 1, uploaded_at: -1 });
MediaSchema.index({ folder: 1, uploaded_at: -1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ 'processing.status': 1 });
MediaSchema.index({ 'used_in.content_id': 1 });

// Virtuals
MediaSchema.virtual('isImage').get(function() {
  return this.mime_type.startsWith('image/');
});

MediaSchema.virtual('isVideo').get(function() {
  return this.mime_type.startsWith('video/');
});

MediaSchema.virtual('isAudio').get(function() {
  return this.mime_type.startsWith('audio/');
});

MediaSchema.virtual('fileType').get(function() {
  if (this.isImage) return 'image';
  if (this.isVideo) return 'video';
  if (this.isAudio) return 'audio';
  return 'document';
});

MediaSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.file_size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Instance methods
MediaSchema.methods.addUsage = function(contentId, usageType) {
  const existingUsage = this.used_in.find(
    usage => usage.content_id === contentId && usage.usage_type === usageType
  );
  
  if (!existingUsage) {
    this.used_in.push({ content_id: contentId, usage_type: usageType });
  }
  
  return this.save();
};

MediaSchema.methods.removeUsage = function(contentId, usageType) {
  this.used_in = this.used_in.filter(
    usage => !(usage.content_id === contentId && usage.usage_type === usageType)
  );
  
  return this.save();
};

MediaSchema.methods.incrementDownloads = function() {
  this.stats.download_count += 1;
  this.stats.last_accessed = new Date();
  return this.save();
};

MediaSchema.methods.incrementViews = function() {
  this.stats.view_count += 1;
  this.stats.last_accessed = new Date();
  return this.save();
};

MediaSchema.methods.markProcessingComplete = function(thumbnails = []) {
  this.processing.status = 'completed';
  this.processing.thumbnails = thumbnails;
  this.processing.processed_at = new Date();
  return this.save();
};

MediaSchema.methods.markProcessingFailed = function(errorMessage) {
  this.processing.status = 'failed';
  this.processing.error_message = errorMessage;
  this.processing.processed_at = new Date();
  return this.save();
};

MediaSchema.methods.getThumbnail = function(size = 'medium') {
  if (!this.isImage) return null;
  
  const thumbnail = this.processing.thumbnails.find(t => t.size === size);
  return thumbnail ? thumbnail.url : this.url;
};

// Static methods
MediaSchema.statics.findByType = function(fileType) {
  let mimePattern;
  switch (fileType) {
    case 'image':
      mimePattern = /^image\//;
      break;
    case 'video':
      mimePattern = /^video\//;
      break;
    case 'audio':
      mimePattern = /^audio\//;
      break;
    default:
      mimePattern = new RegExp(`^${fileType}/`);
  }
  
  return this.find({ mime_type: mimePattern })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.findImages = function() {
  return this.find({ mime_type: /^image\// })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.findByUser = function(userId) {
  return this.find({ uploaded_by: userId })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.findByFolder = function(folder) {
  return this.find({ folder })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.findUnused = function() {
  return this.find({ 'used_in': { $size: 0 } })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.findUsedInContent = function(contentId) {
  return this.find({ 'used_in.content_id': contentId });
};

MediaSchema.statics.searchByTags = function(tags) {
  return this.find({ tags: { $in: Array.isArray(tags) ? tags : [tags] } })
    .sort({ uploaded_at: -1 });
};

MediaSchema.statics.getStorageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$file_size' },
        images: { 
          $sum: { 
            $cond: [{ $regexMatch: { input: '$mime_type', regex: /^image\// } }, 1, 0] 
          }
        },
        videos: { 
          $sum: { 
            $cond: [{ $regexMatch: { input: '$mime_type', regex: /^video\// } }, 1, 0] 
          }
        },
        documents: { 
          $sum: { 
            $cond: [{ 
              $and: [
                { $not: { $regexMatch: { input: '$mime_type', regex: /^image\// } } },
                { $not: { $regexMatch: { input: '$mime_type', regex: /^video\// } } },
                { $not: { $regexMatch: { input: '$mime_type', regex: /^audio\// } } }
              ]
            }, 1, 0] 
          }
        }
      }
    }
  ]);
};

MediaSchema.statics.cleanupUnused = function(olderThanDays = 30) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  return this.find({
    'used_in': { $size: 0 },
    uploaded_at: { $lt: cutoffDate }
  });
};

// Middleware
MediaSchema.pre('save', function(next) {
  // Auto-set file extension from filename if not provided
  if (!this.file_extension && this.filename) {
    const ext = this.filename.split('.').pop();
    if (ext && ext !== this.filename) {
      this.file_extension = ext.toLowerCase();
    }
  }
  
  // Set processing status for images
  if (this.isNew && this.isImage && !this.processing.status) {
    this.processing.status = 'pending';
  }
  
  next();
});

MediaSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  // Here you could add logic to delete the actual file from storage
  console.log(`Deleting media file: ${this.file_path}`);
  next();
});

module.exports = mongoose.model('Media', MediaSchema);