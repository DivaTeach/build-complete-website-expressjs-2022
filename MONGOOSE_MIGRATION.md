# Mongoose Migration Guide

This document explains the migration from raw MongoDB driver to Mongoose ODM and how to use the new implementation.

## What Changed

### Dependencies
- **Removed**: `mongodb` driver
- **Added**: `mongoose` ODM

### Architecture
- **Schema Layer**: All collections now have proper Mongoose schemas with validation
- **Model Layer**: Business logic models that extend a base class
- **Connection**: Automatic connection handling with graceful shutdown

## New Features

### Schema Validation
All data is now validated at the schema level:
```javascript
// Automatic validation
const content = new Content({
  title: 'My Post',
  type: 'blog',
  status: 'published'
  // Missing required fields will throw validation errors
});
```

### Business Logic Methods
Models now include business-specific methods:
```javascript
// Content operations
await Content.publishContent(contentId);
await Content.findFeatured();
await Content.searchContent('javascript');

// User operations
await User.verifyEmail(userId);
await User.updateLastLogin(userId);
await User.findAdmins();

// Settings operations
await Settings.setSetting('site_title', 'My Site');
const siteTitle = await Settings.getSetting('site_title');
```

### Middleware & Hooks
Automatic data processing:
- Timestamps are automatically managed
- Slugs are auto-generated and validated for uniqueness
- Password changes are tracked
- Settings values are validated before saving

## Usage Examples

### Creating Content
```javascript
const { Content } = require('./models');

// Create new blog post
const post = await Content.insert({
  title: 'My First Post',
  content: 'This is the content...',
  type: 'blog',
  author: {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com'
  },
  tags: ['javascript', 'web-development']
});
```

### Querying Content
```javascript
// Get published posts with pagination
const { documents, pagination } = await Content.getPublishedPaginated(1, 10);

// Search content
const results = await Content.searchContent('javascript', { limit: 5 });

// Find by type
const pages = await Content.findByType('page');

// Find featured content
const featured = await Content.findFeatured({ limit: 3 });
```

### User Management
```javascript
const { User } = require('./models');

// Create user
const user = await User.insert({
  username: 'johndoe',
  email: 'john@example.com',
  password_hash: hashedPassword,
  salt: salt,
  role: 'author'
});

// Find and authenticate
const user = await User.findForAuthentication('john@example.com');
if (user && validatePassword(password, user.password_hash, user.salt)) {
  await User.updateLastLogin(user.ID);
}
```

### Settings Management
```javascript
const { Settings } = require('./models');

// Get all public settings (for frontend)
const publicSettings = await Settings.getPublicSettings();

// Update setting
await Settings.setSetting('posts_per_page', 15, userId);

// Get settings by category
const seoSettings = await Settings.getSettingsByCategory('seo');
```

## Database Connection

The application automatically connects to MongoDB on startup:

```javascript
// In bin/www
const mongoose = require("mongoose");
await mongoose.connect(config.mongo.uri, config.mongo.options);
```

Connection features:
- **Automatic reconnection** on connection loss
- **Graceful shutdown** on SIGINT/SIGTERM
- **Connection pooling** for performance
- **Error handling** with proper logging

## Schema Files

All schemas are located in `models/schemas/`:
- `Content.js` - Content management schema
- `User.js` - User accounts and authentication
- `Settings.js` - Application configuration
- `Sessions.js` - User session management
- `Media.js` - File and media metadata
- `Analytics.js` - Site analytics and tracking

## Model Files

Business logic models in `models/`:
- `content.js` - ContentModel class
- `user.js` - UserModel class
- `settings.js` - SettingsModel class
- `base.js` - BaseModel class (shared functionality)

## Migration Benefits

1. **Type Safety**: Automatic type casting and validation
2. **Business Logic**: Methods specific to each model
3. **Performance**: Optimized queries and indexing
4. **Maintainability**: Clear separation of concerns
5. **Error Handling**: Better error messages and validation
6. **Relationships**: Easy population of related documents
7. **Middleware**: Automatic data processing and lifecycle hooks

## Testing

Run the Mongoose test to verify setup:
```bash
node tests/test-mongoose.js
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check MongoDB is running and connection string is correct
2. **Validation Errors**: Review schema requirements and provide all required fields
3. **Index Errors**: Ensure unique fields don't have duplicate values
4. **Performance**: Use appropriate indexes and limit query results

### Debug Mode

Enable Mongoose debugging:
```javascript
mongoose.set('debug', true);
```

This will log all database operations to the console.