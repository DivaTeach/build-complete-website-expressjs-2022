# Application Architecture Design

## Table of Contents
1. [Overall Architecture](#overall-architecture)
2. [Front-end vs Back-end Responsibilities](#front-end-vs-back-end-responsibilities)
3. [REST API Design](#rest-api-design)
4. [Database Schema Design](#database-schema-design)
5. [Business Logic Design](#business-logic-design)
6. [UML Diagrams](#uml-diagrams)

---

## Overall Architecture

### Architecture Pattern: MVC (Model-View-Controller)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │    Database     │
│                 │    │                 │    │                 │
│  - Templates    │◄──►│  - Controllers  │◄──►│   MongoDB       │
│  - Static Files │    │  - Routes       │    │   + Mongoose    │
│  - Client JS    │    │  - Models       │    │  - Schemas      │
│                 │    │  - Middleware   │    │  - Validation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Architecture

```
Request → Express App → Routes → Models → Mongoose → MongoDB
                                   ↓
Response ← Templates ← Views ← Controllers ← Business Logic
```

### Technology Stack
- **Backend**: Node.js + Express.js
- **Template Engine**: Handlebars (HBS)
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Schema-based validation with Mongoose
- **Session Management**: Express sessions with MongoDB store
- **Styling**: LESS CSS
- **Testing**: UVU

---

## Front-end vs Back-end Responsibilities

### Front-end Responsibilities
- **Presentation Layer**
  - Rendering HTML templates using Handlebars
  - Styling with LESS/CSS
  - Client-side JavaScript for interactivity
  - Form validation and user feedback
  - Responsive design implementation

- **User Interface**
  - Navigation and routing
  - Form submissions
  - Dynamic content updates
  - Error message display
  - Loading states

### Back-end Responsibilities
- **Data Management**
  - CRUD operations through Mongoose models
  - Schema-based data validation
  - Mongoose connection management with pooling
  - Automatic type casting and sanitization
  - Database indexing and performance optimization

- **Business Logic**
  - Authentication and authorization
  - Content management workflows
  - Blog post publishing logic
  - Admin panel functionality
  - Error handling and logging

- **API Services**
  - RESTful endpoint management
  - Request/response handling
  - Middleware implementation
  - Security measures

---

## REST API Design

### API Endpoints Structure

#### Content Management API
```
GET    /api/content           # Get all content items
GET    /api/content/:id       # Get specific content item
POST   /api/content           # Create new content item
PUT    /api/content/:id       # Update content item
DELETE /api/content/:id       # Delete content item
```

#### Blog API
```
GET    /api/blog              # Get all blog posts
GET    /api/blog/:id          # Get specific blog post
POST   /api/blog              # Create new blog post
PUT    /api/blog/:id          # Update blog post
DELETE /api/blog/:id          # Delete blog post
GET    /api/blog/published    # Get published blog posts
GET    /api/blog/drafts       # Get draft blog posts
```

#### Pages API
```
GET    /api/pages             # Get all pages
GET    /api/pages/:slug       # Get page by slug
POST   /api/pages             # Create new page
PUT    /api/pages/:id         # Update page
DELETE /api/pages/:id         # Delete page
```

#### Admin API
```
POST   /api/admin/login       # Admin authentication
GET    /api/admin/dashboard   # Dashboard data
GET    /api/admin/stats       # Site statistics
POST   /api/admin/logout      # Admin logout
```

### Request/Response Format

#### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-11-01T12:00:00Z"
}
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "timestamp": "2024-11-01T12:00:00Z"
}
```

---

## Database Schema Design

### Mongoose Schema Architecture

The application uses Mongoose ODM with comprehensive schema definitions that provide:
- **Type validation** and automatic casting
- **Custom validation** rules and middleware
- **Virtual properties** for computed fields
- **Instance and static methods** for business logic
- **Automatic indexing** for performance

### Schema Layers

```
Mongoose Schemas (models/schemas/)
       ↓
Business Models (models/)
       ↓
Base Model Class (models/base.js)
       ↓
Common CRUD Operations
```

### Core Collections

#### 1. Content Collection (Mongoose Schema)
```javascript
const ContentSchema = new mongoose.Schema({
  ID: { type: String, unique: true, required: true },
  type: { type: String, required: true, enum: ['page', 'blog', 'service', 'product', 'custom'] },
  title: { type: String, required: true, minlength: 1, maxlength: 200 },
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]+$/ },
  content: { type: String, required: function() { return this.status === 'published'; } },
  status: { type: String, required: true, enum: ['draft', 'published', 'archived', 'scheduled'] },
  author: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  metadata: {
    seo_title: { type: String, maxlength: 60 },
    seo_description: { type: String, maxlength: 160 },
    featured_image: String
  },
  timestamps: {
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }
});
    published_at: Date
  }
}
```

#### 2. Users Collection (for admin)
```javascript
{
  _id: ObjectId,
  ID: String,
  username: String,
  email: String,
  password_hash: String,
  role: String,            // "admin", "editor", "author"
  profile: {
    first_name: String,
    last_name: String,
    bio: String,
    avatar: String
  },
  settings: Object,
  last_login: Date,
  created_at: Date
}
```

#### 3. Settings Collection
```javascript
{
  _id: ObjectId,
  key: String,             // "site_title", "theme", etc.
  value: Mixed,
  type: String,            // "string", "number", "boolean", "object"
  description: String,
  category: String,
  updated_at: Date
}
```

### Database Indexes
```javascript
// Content collection indexes
db.content.createIndex({ "ID": 1 }, { unique: true });
db.content.createIndex({ "slug": 1 }, { unique: true });
db.content.createIndex({ "type": 1, "status": 1 });
db.content.createIndex({ "timestamps.published_at": -1 });

// Users collection indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// Settings collection indexes
db.settings.createIndex({ "key": 1 }, { unique: true });
```

---

## Business Logic Design

### 1. Content Management Logic

#### Content Service Layer
```javascript
class ContentService {
  // Create content with validation
  async createContent(data) {
    // Validate input
    // Generate slug
    // Set timestamps
    // Save to database
  }
  
  // Publish content
  async publishContent(id) {
    // Validate content is ready
    // Update status
    // Set publish date
  }
  
  // Archive content
  async archiveContent(id) {
    // Update status
    // Preserve data
  }
}
```

#### Blog Service Logic
```javascript
class BlogService extends ContentService {
  // Get published blog posts with pagination
  async getPublishedPosts(page, limit) {
    // Filter by status
    // Sort by publish date
    // Apply pagination
  }
  
  // Search blog posts
  async searchPosts(query) {
    // Text search
    // Tag/category filtering
  }
}
```

### 2. Authentication Logic

#### Admin Authentication
```javascript
class AuthService {
  // Login validation
  async login(username, password) {
    // Validate credentials
    // Create session
    // Update last login
  }
  
  // Session management
  async validateSession(sessionId) {
    // Check session validity
    // Refresh if needed
  }
}
```

### 3. Validation Rules

#### Content Validation
- Title: Required, 1-200 characters
- Slug: Unique, URL-safe format
- Content: Required for published posts
- Status: Must be valid enum value
- Author: Must reference valid user

#### Input Sanitization
- Strip malicious HTML tags
- Validate URLs and email addresses
- Escape special characters
- Limit file upload sizes

---

## UML Diagrams

### 1. Class Diagram

```
┌─────────────────────┐
│    BaseModel        │
├─────────────────────┤
│ - db: Database      │
│ - _collection       │
├─────────────────────┤
│ + setDB()           │
│ + collection()      │
└─────────────────────┘
           ▲
           │
┌─────────────────────┐
│   ContentModel      │
├─────────────────────┤
├─────────────────────┤
│ + insert()          │
│ + update()          │
│ + getlist()         │
│ + remove()          │
└─────────────────────┘

┌─────────────────────┐
│  BaseController     │
├─────────────────────┤
│ - name: String      │
├─────────────────────┤
│ + run()             │
└─────────────────────┘
           ▲
           │
┌─────────────────────┐
│   BlogController    │
├─────────────────────┤
├─────────────────────┤
│ + run()             │
│ + runArticle()      │
└─────────────────────┘
```

### 2. Sequence Diagram - Blog Post Creation

```
User → BlogController → ContentModel → Database
│           │              │           │
│ POST      │              │           │
│ /blog     │              │           │
├──────────►│              │           │
│           │ validate()   │           │
│           ├─────────────►│           │
│           │              │ insert()  │
│           │              ├──────────►│
│           │              │           │
│           │              │◄──────────┤
│           │◄─────────────┤           │
│◄──────────┤              │           │
│ Response  │              │           │
```

### 3. Component Diagram

```
┌─────────────────────────────────────────┐
│                Frontend                 │
├─────────────────────────────────────────┤
│  Templates  │  Static Files  │  Client  │
│    (HBS)    │    (CSS/JS)    │    JS    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│                Express App              │
├─────────────────────────────────────────┤
│ Middleware  │   Routes   │ Controllers  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              Business Logic             │
├─────────────────────────────────────────┤
│   Models    │  Services  │ Validation   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│               Database                  │
├─────────────────────────────────────────┤
│              MongoDB                    │
└─────────────────────────────────────────┘
```

---

## Implementation Recommendations

### 1. Code Organization
- Use dependency injection for better testability
- Implement proper error handling middleware
- Add input validation middleware
- Create service layer for business logic

### 2. Security Considerations
- Implement CSRF protection
- Add rate limiting
- Sanitize all user inputs
- Use HTTPS in production
- Implement proper session management

### 3. Performance Optimization
- Add database indexing
- Implement caching strategy
- Use compression middleware
- Optimize database queries
- Add pagination for large datasets

### 4. Testing Strategy
- Unit tests for models and services
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance testing for database operations

This architecture provides a solid foundation for a scalable content management system with clear separation of concerns and maintainable code structure.