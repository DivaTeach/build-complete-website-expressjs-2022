const mongoose = require('mongoose');

// Define visitor subdocument schema
const VisitorSchema = new mongoose.Schema({
  ip_address: {
    type: String,
    required: true
    // Note: Should be hashed for privacy
  },
  user_agent: String,
  session_id: String,
  user_id: {
    type: String,
    ref: 'User'
  }
}, { _id: false });

// Define location subdocument schema
const LocationSchema = new mongoose.Schema({
  country: String,
  region: String,
  city: String,
  timezone: String,
  coordinates: {
    lat: Number,
    lng: Number
  }
}, { _id: false });

// Define device subdocument schema
const DeviceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: String,
  browser_version: String,
  os: String,
  os_version: String,
  screen_resolution: String,
  viewport_size: String
}, { _id: false });

// Define referrer subdocument schema
const ReferrerSchema = new mongoose.Schema({
  url: String,
  domain: String,
  source: {
    type: String,
    enum: ['organic', 'social', 'direct', 'referral', 'email', 'paid'],
    default: 'direct'
  },
  campaign: String,
  medium: String,
  term: String, // Search term for organic traffic
  content: String // UTM content parameter
}, { _id: false });

// Define metrics subdocument schema
const MetricsSchema = new mongoose.Schema({
  duration: {
    type: Number,
    min: 0 // Time spent on page in seconds
  },
  scroll_depth: {
    type: Number,
    min: 0,
    max: 100 // Scroll percentage
  },
  bounce: {
    type: Boolean,
    default: false
  },
  exit_page: {
    type: Boolean,
    default: false
  },
  page_load_time: Number, // Page load time in milliseconds
  interactions: {
    clicks: { type: Number, default: 0 },
    form_submissions: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 }
  }
}, { _id: false });

// Main Analytics Schema
const AnalyticsSchema = new mongoose.Schema({
  // Event tracking
  event_type: {
    type: String,
    required: true,
    enum: [
      'page_view', 
      'download', 
      'form_submit', 
      'search', 
      'click', 
      'video_play',
      'video_complete',
      'scroll_milestone',
      'time_milestone',
      'custom'
    ],
    index: true
  },
  
  content_id: {
    type: String,
    ref: 'Content',
    index: true
  },
  
  page_url: {
    type: String,
    required: true,
    index: true
  },
  
  page_title: String,
  
  // Event-specific data
  event_data: mongoose.Schema.Types.Mixed,
  
  // Visitor information
  visitor: VisitorSchema,
  
  // Geographic data
  location: LocationSchema,
  
  // Device information
  device: DeviceSchema,
  
  // Referrer information
  referrer: ReferrerSchema,
  
  // Performance and engagement metrics
  metrics: MetricsSchema,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Additional metadata
  meta: {
    user_agent_raw: String,
    ip_address_raw: String, // Store hashed version
    server_timestamp: Date,
    processed: { type: Boolean, default: false }
  }

}, {
  timestamps: false, // Using custom timestamp field
  collection: 'analytics'
});

// Indexes for performance
AnalyticsSchema.index({ timestamp: -1 }); // Most recent first
AnalyticsSchema.index({ event_type: 1, timestamp: -1 });
AnalyticsSchema.index({ content_id: 1, timestamp: -1 });
AnalyticsSchema.index({ 'visitor.session_id': 1 });
AnalyticsSchema.index({ 'visitor.user_id': 1, timestamp: -1 });
AnalyticsSchema.index({ page_url: 1, timestamp: -1 });
AnalyticsSchema.index({ 'device.type': 1 });
AnalyticsSchema.index({ 'referrer.source': 1 });
AnalyticsSchema.index({ 'location.country': 1 });

// Compound indexes for common queries
AnalyticsSchema.index({ 
  event_type: 1, 
  timestamp: -1, 
  'visitor.session_id': 1 
});

// TTL index to automatically remove old analytics data
AnalyticsSchema.index({ timestamp: 1 }, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year
});

// Static methods for analytics queries
AnalyticsSchema.statics.getPageViews = function(startDate, endDate, contentId = null) {
  const match = {
    event_type: 'page_view',
    timestamp: { $gte: startDate, $lte: endDate }
  };
  
  if (contentId) {
    match.content_id = contentId;
  }
  
  return this.countDocuments(match);
};

AnalyticsSchema.statics.getUniqueVisitors = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$visitor.session_id'
      }
    },
    {
      $count: 'unique_visitors'
    }
  ]);
};

AnalyticsSchema.statics.getTopPages = function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$page_url',
        views: { $sum: 1 },
        unique_visitors: { $addToSet: '$visitor.session_id' }
      }
    },
    {
      $project: {
        page_url: '$_id',
        views: 1,
        unique_visitors: { $size: '$unique_visitors' }
      }
    },
    {
      $sort: { views: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

AnalyticsSchema.statics.getTrafficSources = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$referrer.source',
        sessions: { $addToSet: '$visitor.session_id' },
        pageviews: { $sum: 1 }
      }
    },
    {
      $project: {
        source: '$_id',
        sessions: { $size: '$sessions' },
        pageviews: 1
      }
    },
    {
      $sort: { sessions: -1 }
    }
  ]);
};

AnalyticsSchema.statics.getDeviceStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$device.type',
        sessions: { $addToSet: '$visitor.session_id' },
        pageviews: { $sum: 1 }
      }
    },
    {
      $project: {
        device_type: '$_id',
        sessions: { $size: '$sessions' },
        pageviews: 1
      }
    },
    {
      $sort: { sessions: -1 }
    }
  ]);
};

AnalyticsSchema.statics.getBounceRate = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$visitor.session_id',
        pageviews: { $sum: 1 },
        bounce: { $first: '$metrics.bounce' }
      }
    },
    {
      $group: {
        _id: null,
        total_sessions: { $sum: 1 },
        bounced_sessions: {
          $sum: { $cond: [{ $eq: ['$pageviews', 1] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        bounce_rate: {
          $multiply: [
            { $divide: ['$bounced_sessions', '$total_sessions'] },
            100
          ]
        }
      }
    }
  ]);
};

AnalyticsSchema.statics.getAverageSessionDuration = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate },
        'metrics.duration': { $exists: true, $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$visitor.session_id',
        total_duration: { $sum: '$metrics.duration' }
      }
    },
    {
      $group: {
        _id: null,
        average_duration: { $avg: '$total_duration' }
      }
    }
  ]);
};

AnalyticsSchema.statics.getPopularContent = function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        event_type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate },
        content_id: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$content_id',
        views: { $sum: 1 },
        unique_visitors: { $addToSet: '$visitor.session_id' },
        avg_duration: { $avg: '$metrics.duration' }
      }
    },
    {
      $project: {
        content_id: '$_id',
        views: 1,
        unique_visitors: { $size: '$unique_visitors' },
        avg_duration: { $round: ['$avg_duration', 2] }
      }
    },
    {
      $sort: { views: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

AnalyticsSchema.statics.recordPageView = function(data) {
  return this.create({
    event_type: 'page_view',
    ...data,
    timestamp: new Date()
  });
};

AnalyticsSchema.statics.recordEvent = function(eventType, data) {
  return this.create({
    event_type: eventType,
    ...data,
    timestamp: new Date()
  });
};

// Clean up old analytics data
AnalyticsSchema.statics.cleanupOldData = function(olderThanDays = 365) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

// Instance methods
AnalyticsSchema.methods.anonymize = function() {
  // Remove or hash sensitive data
  if (this.visitor.ip_address) {
    this.visitor.ip_address = 'anonymized';
  }
  if (this.meta.ip_address_raw) {
    this.meta.ip_address_raw = 'anonymized';
  }
  this.visitor.user_agent = 'anonymized';
  this.meta.user_agent_raw = 'anonymized';
  
  return this.save();
};

module.exports = mongoose.model('Analytics', AnalyticsSchema);