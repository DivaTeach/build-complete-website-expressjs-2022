# REST API Specification

## Overview
This document outlines the REST API design for the Express.js content management system. The API follows RESTful principles and provides endpoints for content management, blog operations, and administrative functions. All data operations are handled through Mongoose ODM with schema validation.

## Base URL
- Development: `http://localhost:3000/api`
- Staging: `http://staging.yourapp.com/api`
- Production: `https://yourapp.com/api`

## Data Layer
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Schema-based validation with automatic type casting
- **Models**: Business logic models extending BaseModel class

## Authentication
- Admin endpoints require session-based authentication
- Public endpoints are accessible without authentication

## Content Type
- Request: `application/json`
- Response: `application/json`

## Error Handling
All API responses follow consistent error format with Mongoose validation details when applicable.

---

## API Endpoints

### Content Management

#### GET /api/content
Get all content items with optional filtering and pagination.

**Query Parameters:**
- `type` (string): Filter by content type (page, blog, service)
- `status` (string): Filter by status (published, draft, archived)
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search in title and content

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ID": "abc123",
        "type": "blog",
        "title": "Sample Blog Post",
        "slug": "sample-blog-post",
        "excerpt": "This is a sample blog post...",
        "status": "published",
        "author": "John Doe",
        "tags": ["technology", "web"],
        "timestamps": {
          "created_at": "2024-01-01T12:00:00Z",
          "updated_at": "2024-01-02T12:00:00Z",
          "published_at": "2024-01-02T12:00:00Z"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

#### GET /api/content/:id
Get a specific content item by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "ID": "abc123",
    "type": "blog",
    "title": "Sample Blog Post",
    "slug": "sample-blog-post",
    "content": "Full content of the blog post...",
    "excerpt": "This is a sample blog post...",
    "status": "published",
    "author": "John Doe",
    "tags": ["technology", "web"],
    "categories": ["Tech News"],
    "metadata": {
      "seo_title": "Sample Blog Post - Tech Blog",
      "seo_description": "A comprehensive guide to...",
      "featured_image": "/images/sample-post.jpg"
    },
    "timestamps": {
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-02T12:00:00Z",
      "published_at": "2024-01-02T12:00:00Z"
    }
  }
}
```

#### POST /api/content
Create a new content item. **Requires authentication.**

**Request Body:**
```json
{
  "type": "blog",
  "title": "New Blog Post",
  "content": "Content of the blog post...",
  "excerpt": "Short description...",
  "status": "draft",
  "tags": ["technology"],
  "categories": ["Tech News"],
  "metadata": {
    "seo_title": "New Blog Post",
    "seo_description": "Description for SEO",
    "featured_image": "/images/new-post.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ID": "def456",
    "message": "Content created successfully"
  }
}
```

#### PUT /api/content/:id
Update an existing content item. **Requires authentication.**

**Request Body:**
```json
{
  "title": "Updated Blog Post Title",
  "content": "Updated content...",
  "status": "published"
}
```

#### DELETE /api/content/:id
Delete a content item. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Content deleted successfully"
  }
}
```

---

### Blog-Specific Endpoints

#### GET /api/blog
Get all blog posts (published only for public access).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Posts per page
- `tag` (string): Filter by tag
- `category` (string): Filter by category
- `author` (string): Filter by author

#### GET /api/blog/:id
Get a specific blog post by ID.

#### GET /api/blog/published
Get all published blog posts.

#### GET /api/blog/drafts
Get all draft blog posts. **Requires authentication.**

#### POST /api/blog/:id/publish
Publish a blog post. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Blog post published successfully",
    "published_at": "2024-01-02T12:00:00Z"
  }
}
```

---

### Page Management

#### GET /api/pages
Get all pages.

#### GET /api/pages/:slug
Get a page by its slug.

**Response:**
```json
{
  "success": true,
  "data": {
    "ID": "page123",
    "title": "About Us",
    "slug": "about-us",
    "content": "About our company...",
    "type": "page",
    "status": "published"
  }
}
```

---

### Administrative Endpoints

#### POST /api/admin/login
Authenticate admin user.

**Request Body:**
```json
{
  "username": "admin",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "ID": "user123",
      "username": "admin",
      "role": "admin"
    },
    "session_id": "sess_abc123"
  }
}
```

#### GET /api/admin/dashboard
Get dashboard statistics. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_posts": 45,
      "published_posts": 40,
      "draft_posts": 5,
      "total_pages": 8,
      "recent_activity": [
        {
          "action": "created",
          "item_type": "blog",
          "item_title": "New Blog Post",
          "timestamp": "2024-01-02T10:00:00Z"
        }
      ]
    }
  }
}
```

#### POST /api/admin/logout
Logout admin user. **Requires authentication.**

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": ["Detailed error information"]
  },
  "timestamp": "2024-01-02T12:00:00Z"
}
```

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      "Title is required",
      "Content must be at least 10 characters"
    ]
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Content not found"
  }
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SLUG",
    "message": "A content item with this slug already exists"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Request/Response Examples

### Creating a Blog Post

**Request:**
```http
POST /api/content HTTP/1.1
Content-Type: application/json
Authorization: Session sess_abc123

{
  "type": "blog",
  "title": "Introduction to Node.js",
  "content": "Node.js is a powerful runtime environment...",
  "excerpt": "Learn the basics of Node.js development",
  "tags": ["nodejs", "javascript", "backend"],
  "categories": ["Programming"],
  "metadata": {
    "seo_title": "Introduction to Node.js - Complete Guide",
    "seo_description": "A comprehensive introduction to Node.js",
    "featured_image": "/images/nodejs-intro.jpg"
  }
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "ID": "blog_5f8a1b2c3d4e5f6789012345",
    "slug": "introduction-to-nodejs",
    "message": "Blog post created successfully"
  },
  "timestamp": "2024-01-02T12:00:00Z"
}
```

### Searching Content

**Request:**
```http
GET /api/content?type=blog&status=published&search=nodejs&page=1&limit=5 HTTP/1.1
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "items": [
      {
        "ID": "blog_5f8a1b2c3d4e5f6789012345",
        "title": "Introduction to Node.js",
        "slug": "introduction-to-nodejs",
        "excerpt": "Learn the basics of Node.js development",
        "status": "published",
        "timestamps": {
          "created_at": "2024-01-02T12:00:00Z",
          "published_at": "2024-01-02T12:30:00Z"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1,
      "has_next": false,
      "has_prev": false
    }
  },
  "timestamp": "2024-01-02T12:45:00Z"
}
```

---

## Implementation Notes

### Pagination
- All list endpoints support pagination
- Default page size is 10 items
- Maximum page size is 100 items
- Include pagination metadata in response

### Slug Generation
- Automatically generated from title
- Must be URL-safe and unique
- Allow manual override during creation

### Status Management
- Draft: Not visible to public
- Published: Visible to public
- Archived: Hidden but preserved

### Search Functionality
- Text search in title and content
- Tag and category filtering
- Case-insensitive search

### Rate Limiting
- Implement rate limiting for API endpoints
- Different limits for authenticated vs public access
- Return rate limit headers in response

### Caching
- Cache frequently accessed content
- Implement cache invalidation on updates
- Use ETags for conditional requests