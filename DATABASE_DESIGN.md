# Database Design & Schema Documentation

## Overview
This document outlines the database design for the Express.js content management system using MongoDB with Mongoose ODM. The design focuses on flexibility, performance, and scalability while maintaining data integrity through schema validation.

## Database Technology Choice: MongoDB with Mongoose

### Why MongoDB with Mongoose?
- **Document-oriented**: Perfect for content management with varying field structures
- **Schema validation**: Mongoose provides robust data validation and type casting
- **Middleware support**: Pre/post hooks for data processing and business logic
- **Population**: Easy relationship handling through virtual joins
- **JSON-like storage**: Natural fit for Node.js/Express applications
- **Scalability**: Horizontal scaling capabilities
- **Rich query language**: Supports complex queries, aggregations, and text search

---

## Database Structure

### Database Name: `content_management_db`

### Collections Overview
1. **content** - Main content storage (pages, blog posts, etc.)
2. **users** - User accounts and authentication
3. **settings** - Application configuration
4. **sessions** - User session management
5. **media** - File and image metadata
6. **analytics** - Basic site analytics (optional)

### Mongoose Schema Definitions

All schemas are defined using Mongoose with built-in validation, middleware, and virtual properties. The schemas provide:
- **Type validation** and casting
- **Custom validation** rules
- **Pre/post middleware** for data processing
- **Virtual properties** for computed fields
- **Instance and static methods** for business logic
- **Automatic indexing** for performance

---

## Mongoose Models and Usage

### Model Architecture

The application uses a layered model architecture:

1. **Schema Layer** (`models/schemas/`): Pure Mongoose schemas with validation, middleware, and methods
2. **Model Layer** (`models/`): Business logic models that extend a base class
3. **Base Model** (`models/base.js`): Common CRUD operations and utilities

### Usage Examples

```javascript
// Import models
const { Content, User, Settings } = require('./models');

// Create new content
const newPost = await Content.insert({
  title: 'My Blog Post',
  content: 'Post content here...',
  type: 'blog',
  author: {
    id: userId,
    name: 'Author Name',
    email: 'author@example.com'
  }
});

// Find published content
const publishedPosts = await Content.findPublished({ limit: 10 });

// Search content
const searchResults = await Content.searchContent('javascript', { limit: 5 });

// User operations
const user = await User.findByEmail('user@example.com');
await User.updateLastLogin(user.ID);

// Settings operations
const siteTitle = await Settings.getSetting('site_title');
await Settings.setSetting('posts_per_page', 15, userId);
```

### Available Models

1. **ContentModel** - Content management operations
2. **UserModel** - User account and authentication management
3. **SettingsModel** - Application configuration management

Each model provides:
- Standard CRUD operations (insert, update, remove, findById, getlist)
- Specialized finder methods
- Business logic methods
- Validation and error handling
- Pagination support

---

## Detailed Schema Definitions

### 1. Content Collection

The main collection storing all content types (pages, blog posts, services, etc.).

```javascript
{
  // MongoDB ObjectId
  _id: ObjectId("507f1f77bcf86cd799439011"),
  
  // Custom ID for application use
  ID: String,                    // Required, Unique, Generated: crypto.randomBytes(20).toString('hex')
  
  // Content classification
  type: String,                  // Required, Enum: ["page", "blog", "service", "product", "custom"]
  
  // Basic content fields
  title: String,                 // Required, Min: 1, Max: 200
  slug: String,                  // Required, Unique, URL-safe format
  content: String,               // Main content body, Rich text/HTML
  excerpt: String,               // Short description, Max: 500 chars
  
  // Publishing information
  status: String,                // Required, Enum: ["draft", "published", "archived", "scheduled"]
  visibility: String,            // Enum: ["public", "private", "protected"]
  
  // Author information
  author: {
    id: String,                  // Reference to users.ID
    name: String,                // Author display name
    email: String                // Author email
  },
  
  // Categorization
  tags: [String],                // Array of tag strings
  categories: [String],          // Array of category strings
  
  // SEO and metadata
  metadata: {
    seo_title: String,           // Max: 60 chars
    seo_description: String,     // Max: 160 chars
    seo_keywords: [String],      // Array of keywords
    featured_image: String,      // Image URL or path
    og_image: String,            // Open Graph image
    canonical_url: String,       // Canonical URL for SEO
    robots: String,              // Robots meta tag content
    schema_markup: Object        // JSON-LD structured data
  },
  
  // Content-specific fields
  blog_specific: {
    reading_time: Number,        // Estimated reading time in minutes
    word_count: Number,          // Automatic word count
    comments_enabled: Boolean,   // Allow comments
    featured: Boolean,           // Featured post flag
    series: String,              // Blog series name
    part_number: Number          // Part number in series
  },
  
  // Page-specific fields
  page_specific: {
    template: String,            // Custom template name
    menu_order: Number,          // Order in navigation
    parent_page: String,         // Parent page ID for hierarchy
    show_in_nav: Boolean,        // Show in navigation menu
    custom_fields: Object        // Flexible custom fields
  },
  
  // Publishing schedule
  schedule: {
    publish_at: Date,            // Scheduled publish time
    unpublish_at: Date,          // Scheduled unpublish time
    timezone: String             // Timezone for scheduling
  },
  
  // Version control
  version: {
    number: Number,              // Version number
    changelog: String,           // Version changes description
    auto_save: Object           // Auto-saved draft data
  },
  
  // Engagement metrics
  metrics: {
    view_count: Number,          // Page/post views
    like_count: Number,          // Likes/reactions
    share_count: Number,         // Social shares
    comment_count: Number,       // Comments count
    last_viewed: Date           // Last view timestamp
  },
  
  // Timestamps
  timestamps: {
    created_at: Date,            // Required, Auto-generated
    updated_at: Date,            // Required, Auto-updated
    published_at: Date,          // Set when status changes to published
    last_modified_by: String     // User ID who last modified
  }
}
```

### 2. Users Collection

User accounts for authentication and content management.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  
  // User identification
  ID: String,                    // Required, Unique, Generated
  username: String,              // Required, Unique, Min: 3, Max: 30
  email: String,                 // Required, Unique, Valid email format
  
  // Authentication
  password_hash: String,         // Required, Hashed password
  salt: String,                  // Password salt
  two_factor: {
    enabled: Boolean,            // 2FA enabled flag
    secret: String,              // 2FA secret
    backup_codes: [String]       // Recovery codes
  },
  
  // User role and permissions
  role: String,                  // Required, Enum: ["super_admin", "admin", "editor", "author", "contributor"]
  permissions: [String],         // Specific permissions array
  status: String,                // Enum: ["active", "inactive", "suspended", "pending"]
  
  // Profile information
  profile: {
    first_name: String,          // Max: 50 chars
    last_name: String,           // Max: 50 chars
    display_name: String,        // Public display name
    bio: String,                 // User biography, Max: 500 chars
    avatar: String,              // Avatar image URL
    website: String,             // Personal website URL
    social: {
      twitter: String,
      linkedin: String,
      github: String,
      facebook: String
    }
  },
  
  // User preferences
  settings: {
    theme: String,               // UI theme preference
    language: String,            // Preferred language
    timezone: String,            // User timezone
    notifications: {
      email: Boolean,
      push: Boolean,
      frequency: String          // "immediate", "daily", "weekly"
    },
    editor_preferences: {
      editor_type: String,       // "wysiwyg", "markdown", "html"
      auto_save: Boolean,
      spell_check: Boolean
    }
  },
  
  // Activity tracking
  activity: {
    last_login: Date,
    last_active: Date,
    login_count: Number,
    failed_login_attempts: Number,
    last_failed_login: Date,
    password_changed_at: Date
  },
  
  // Timestamps
  created_at: Date,
  updated_at: Date,
  email_verified_at: Date
}
```

### 3. Settings Collection

Application-wide configuration settings.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  
  key: String,                   // Required, Unique, Setting identifier
  value: Mixed,                  // Setting value (String, Number, Boolean, Object, Array)
  type: String,                  // Required, Enum: ["string", "number", "boolean", "object", "array"]
  
  // Setting metadata
  category: String,              // Setting category: "general", "seo", "social", "email", etc.
  label: String,                 // Human-readable label
  description: String,           // Setting description
  default_value: Mixed,          // Default value
  
  // Validation rules
  validation: {
    required: Boolean,
    min_length: Number,
    max_length: Number,
    pattern: String,             // Regex pattern
    options: [Mixed]             // Valid options for enum-type settings
  },
  
  // Access control
  access_level: String,          // Enum: ["public", "admin", "super_admin"]
  editable: Boolean,             // Can be edited through UI
  
  // Timestamps
  created_at: Date,
  updated_at: Date,
  updated_by: String             // User ID who last updated
}
```

**Example Settings Documents:**
```javascript
// Site configuration
{
  key: "site_title",
  value: "My Awesome Blog",
  type: "string",
  category: "general",
  label: "Site Title",
  description: "The main title of your website"
}

// SEO settings
{
  key: "default_meta_description",
  value: "Welcome to our amazing blog with great content",
  type: "string",
  category: "seo",
  validation: { max_length: 160 }
}

// Email configuration
{
  key: "smtp_settings",
  value: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "your-email@gmail.com",
      pass: "app-password"
    }
  },
  type: "object",
  category: "email",
  access_level: "admin"
}
```

### 4. Sessions Collection

User session management for authentication.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  
  session_id: String,            // Required, Unique, Session identifier
  user_id: String,               // Required, Reference to users.ID
  
  // Session data
  data: Object,                  // Session data storage
  
  // Session metadata
  ip_address: String,            // Client IP address
  user_agent: String,            // Client user agent
  created_at: Date,              // Session creation time
  last_accessed: Date,           // Last access time
  expires_at: Date,              // Session expiration
  
  // Security flags
  is_active: Boolean,            // Session active status
  device_info: {
    browser: String,
    os: String,
    device_type: String          // "desktop", "mobile", "tablet"
  }
}
```

### 5. Media Collection

File and image metadata storage.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  
  // File identification
  ID: String,                    // Required, Unique, Generated
  filename: String,              // Original filename
  file_path: String,             // Storage path
  url: String,                   // Public URL
  
  // File information
  file_size: Number,             // Size in bytes
  mime_type: String,             // MIME type
  file_extension: String,        // File extension
  
  // Image-specific metadata
  image_metadata: {
    width: Number,
    height: Number,
    alt_text: String,
    caption: String,
    exif_data: Object            // EXIF data for photos
  },
  
  // Organization
  folder: String,                // Folder/directory
  tags: [String],                // File tags
  
  // Usage tracking
  used_in: [{
    content_id: String,          // Reference to content.ID
    usage_type: String           // "featured_image", "inline", "attachment"
  }],
  
  // Upload information
  uploaded_by: String,           // User ID who uploaded
  uploaded_at: Date,
  
  // Processing status
  processing: {
    status: String,              // "pending", "processing", "completed", "failed"
    thumbnails: [{
      size: String,              // "small", "medium", "large"
      url: String,
      width: Number,
      height: Number
    }]
  }
}
```

### 6. Analytics Collection (Optional)

Basic site analytics and metrics.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439016"),
  
  // Event tracking
  event_type: String,            // "page_view", "download", "form_submit", etc.
  content_id: String,            // Reference to content.ID
  page_url: String,              // Page URL
  
  // Visitor information
  visitor: {
    ip_address: String,          // Hashed for privacy
    user_agent: String,
    session_id: String,
    user_id: String              // If logged in
  },
  
  // Geographic data
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // Device information
  device: {
    type: String,                // "desktop", "mobile", "tablet"
    browser: String,
    os: String,
    screen_resolution: String
  },
  
  // Referrer information
  referrer: {
    url: String,
    domain: String,
    source: String,              // "organic", "social", "direct", "referral"
    campaign: String             // UTM campaign
  },
  
  // Metrics
  metrics: {
    duration: Number,            // Time spent on page (seconds)
    scroll_depth: Number,        // Scroll percentage
    bounce: Boolean              // Single page visit
  },
  
  timestamp: Date                // Required, Event timestamp
}
```

---

## Database Indexes

### Automatic Index Creation

Mongoose automatically creates indexes based on schema definitions. All indexes are defined in the schema files and created when the application starts.

### Content Collection Indexes
```javascript
// Defined in Content schema
ContentSchema.index({ ID: 1 }, { unique: true }); // Automatic from unique: true
ContentSchema.index({ slug: 1 }, { unique: true }); // Automatic from unique: true
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
```

### Users Collection Indexes
```javascript
// Defined in User schema
UserSchema.index({ ID: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ 'activity.last_login': -1 });
UserSchema.index({ email_verified_at: 1 });
```

### Settings Collection Indexes
```javascript
// Defined in Settings schema
SettingsSchema.index({ key: 1 }, { unique: true });
SettingsSchema.index({ category: 1 });
SettingsSchema.index({ access_level: 1, editable: 1 });
```

### Sessions Collection Indexes
```javascript
// Defined in Sessions schema
SessionsSchema.index({ session_id: 1 }, { unique: true });
SessionsSchema.index({ user_id: 1 });
SessionsSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index
SessionsSchema.index({ last_accessed: 1 });
SessionsSchema.index({ user_id: 1, is_active: 1 });
SessionsSchema.index({ user_id: 1, last_accessed: -1 });
```

### Media Collection Indexes
```javascript
// Defined in Media schema
MediaSchema.index({ ID: 1 }, { unique: true });
MediaSchema.index({ file_path: 1 }, { unique: true });
MediaSchema.index({ uploaded_by: 1, uploaded_at: -1 });
MediaSchema.index({ mime_type: 1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ folder: 1, uploaded_at: -1 });
MediaSchema.index({ 'processing.status': 1 });
MediaSchema.index({ 'used_in.content_id': 1 });
```

### Analytics Collection Indexes
```javascript
// Defined in Analytics schema
AnalyticsSchema.index({ timestamp: -1 });
AnalyticsSchema.index({ event_type: 1, timestamp: -1 });
AnalyticsSchema.index({ content_id: 1, timestamp: -1 });
AnalyticsSchema.index({ 'visitor.session_id': 1 });
AnalyticsSchema.index({ 'visitor.user_id': 1, timestamp: -1 });
AnalyticsSchema.index({ page_url: 1, timestamp: -1 });
AnalyticsSchema.index({ 'device.type': 1 });
AnalyticsSchema.index({ 'referrer.source': 1 });
AnalyticsSchema.index({ 'location.country': 1 });

// TTL index for automatic cleanup
AnalyticsSchema.index({ timestamp: 1 }, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year
});
```

---

## Data Relationships

### Content to Users
- `content.author.id` → `users.ID`
- One-to-many: One user can create many content items

### Content to Media
- `media.used_in.content_id` → `content.ID`
- Many-to-many: Content can use multiple media files, media can be used in multiple content items

### Sessions to Users
- `sessions.user_id` → `users.ID`
- One-to-many: One user can have multiple sessions

### Analytics to Content
- `analytics.content_id` → `content.ID`
- One-to-many: One content item can have many analytics events

---

## Data Validation

### Mongoose Schema Validation

All data validation is handled by Mongoose schemas with built-in and custom validators.

### Content Validation
```javascript
// Automatic validation through Mongoose schema
const ContentSchema = new mongoose.Schema({
  ID: { type: String, unique: true, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['page', 'blog', 'service', 'product', 'custom'] 
  },
  title: { 
    type: String, 
    required: true, 
    minlength: 1, 
    maxlength: 200 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[a-z0-9-]+$/ 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['draft', 'published', 'archived', 'scheduled'] 
  },
  content: { 
    type: String,
    required: function() { return this.status === 'published'; }
  },
  'author.id': { type: String, required: true },
  'metadata.seo_title': { type: String, maxlength: 60 },
  'metadata.seo_description': { type: String, maxlength: 160 }
});
```

### User Validation
```javascript
// Automatic validation through Mongoose schema
const UserSchema = new mongoose.Schema({
  ID: { type: String, unique: true, required: true },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    minlength: 3, 
    maxlength: 30, 
    match: /^[a-zA-Z0-9_]+$/ 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
  },
  password_hash: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['super_admin', 'admin', 'editor', 'author', 'contributor'] 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'inactive', 'suspended', 'pending'] 
  }
});
```

### Settings Validation
```javascript
// Custom validation method in Settings schema
SettingsSchema.methods.validateValue = function(value) {
  if (!this.validation) return true;
  
  const validation = this.validation;
  
  // Check required
  if (validation.required && (value === null || value === undefined || value === '')) {
    return false;
  }
  
  // Type-specific validations
  if (this.type === 'string' && typeof value === 'string') {
    if (validation.min_length && value.length < validation.min_length) return false;
    if (validation.max_length && value.length > validation.max_length) return false;
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) return false;
  }
  
  // Enum options
  if (validation.options && validation.options.length > 0) {
    if (!validation.options.includes(value)) return false;
  }
  
  return true;
};
```

### Middleware Validation

Mongoose middleware provides additional validation and data processing:

```javascript
// Content schema middleware
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

// Settings schema middleware
SettingsSchema.pre('save', function(next) {
  if (!this.validateValue(this.value)) {
    return next(new Error(`Invalid value for setting ${this.key}`));
  }
  next();
});
```

---

## Performance Considerations

### Query Optimization
1. **Use appropriate indexes** for frequently queried fields
2. **Limit result sets** with pagination
3. **Project only needed fields** to reduce bandwidth
4. **Use aggregation pipelines** for complex queries

### Caching Strategy
1. **Cache frequently accessed content** (published blog posts, pages)
2. **Cache user sessions** in Redis for faster access
3. **Cache settings** to avoid repeated database queries
4. **Implement cache invalidation** on content updates

### Data Archival
1. **Archive old analytics data** after a certain period
2. **Soft delete content** by changing status to 'archived'
3. **Clean up expired sessions** automatically
4. **Compress old content versions**

---

## Security Considerations

### Data Protection
1. **Hash passwords** using bcrypt with salt
2. **Encrypt sensitive settings** like API keys
3. **Sanitize user inputs** to prevent injection attacks
4. **Use connection encryption** for database communications

### Access Control
1. **Implement role-based permissions**
2. **Validate user access** for each operation
3. **Audit trail** for sensitive operations
4. **Rate limiting** for API endpoints

### Data Privacy
1. **Hash IP addresses** in analytics
2. **Implement data retention policies**
3. **Provide data export/deletion** for users
4. **Comply with GDPR/privacy regulations**