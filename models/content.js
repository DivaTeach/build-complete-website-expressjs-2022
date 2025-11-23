const Base = require("./base");
const { Content } = require("./schemas");

module.exports = class ContentModel extends Base {
  constructor() {
    super(Content);
  }

  // Override insert to handle content-specific logic
  async insert(data) {
    try {
      // Set default values for content
      const contentData = {
        type: 'page',
        status: 'draft',
        visibility: 'public',
        ...data
      };

      // Validate required fields
      if (!contentData.title) {
        throw new Error('Title is required');
      }

      // Generate slug from title if not provided
      if (!contentData.slug) {
        contentData.slug = this.generateSlug(contentData.title);
      }

      // Ensure slug is unique
      contentData.slug = await this.ensureUniqueSlug(contentData.slug);

      return await super.insert(contentData);
    } catch (error) {
      throw new Error(`Content creation failed: ${error.message}`);
    }
  }

  // Override update to handle content-specific logic
  async update(ID, data) {
    try {
      // Handle slug updates
      if (data.slug) {
        data.slug = await this.ensureUniqueSlug(data.slug, ID);
      }

      // Handle title updates that might affect slug
      if (data.title && !data.slug) {
        const existingContent = await this.findById(ID);
        if (existingContent && !existingContent.slug) {
          data.slug = await this.ensureUniqueSlug(this.generateSlug(data.title), ID);
        }
      }

      return await super.update(ID, data);
    } catch (error) {
      throw new Error(`Content update failed: ${error.message}`);
    }
  }

  // Content-specific methods
  async findPublished(options = {}) {
    try {
      const query = { status: 'published' };
      const defaultOptions = {
        sort: { 'timestamps.published_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find published content failed: ${error.message}`);
    }
  }

  async findByType(type, options = {}) {
    try {
      const query = { type, status: 'published' };
      const defaultOptions = {
        sort: { 'timestamps.published_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find content by type failed: ${error.message}`);
    }
  }

  async findBySlug(slug, options = {}) {
    try {
      return await this.findOne({ slug }, options);
    } catch (error) {
      throw new Error(`Find content by slug failed: ${error.message}`);
    }
  }

  async findFeatured(options = {}) {
    try {
      const query = { 
        status: 'published',
        'blog_specific.featured': true 
      };
      const defaultOptions = {
        sort: { 'timestamps.published_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find featured content failed: ${error.message}`);
    }
  }

  async findByAuthor(authorId, options = {}) {
    try {
      const query = { 'author.id': authorId };
      const defaultOptions = {
        sort: { 'timestamps.created_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find content by author failed: ${error.message}`);
    }
  }

  async findByTags(tags, options = {}) {
    try {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      const query = { 
        tags: { $in: tagArray },
        status: 'published'
      };
      const defaultOptions = {
        sort: { 'timestamps.published_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find content by tags failed: ${error.message}`);
    }
  }

  async findByCategories(categories, options = {}) {
    try {
      const categoryArray = Array.isArray(categories) ? categories : [categories];
      const query = { 
        categories: { $in: categoryArray },
        status: 'published'
      };
      const defaultOptions = {
        sort: { 'timestamps.published_at': -1 },
        ...options
      };
      return await this.getlist(query, defaultOptions);
    } catch (error) {
      throw new Error(`Find content by categories failed: ${error.message}`);
    }
  }

  async searchContent(searchTerm, options = {}) {
    try {
      const additionalQuery = { status: 'published' };
      const results = await this.search(searchTerm, options);
      
      // Filter by published status
      return results.filter(content => content.status === 'published');
    } catch (error) {
      throw new Error(`Content search failed: ${error.message}`);
    }
  }

  async publishContent(ID) {
    try {
      const updateData = {
        status: 'published',
        'timestamps.published_at': new Date()
      };
      return await this.update(ID, updateData);
    } catch (error) {
      throw new Error(`Content publishing failed: ${error.message}`);
    }
  }

  async archiveContent(ID) {
    try {
      const updateData = { status: 'archived' };
      return await this.update(ID, updateData);
    } catch (error) {
      throw new Error(`Content archiving failed: ${error.message}`);
    }
  }

  async incrementViews(ID) {
    try {
      const content = await this.findById(ID);
      if (!content) {
        throw new Error('Content not found');
      }

      const updateData = {
        'metrics.view_count': (content.metrics?.view_count || 0) + 1,
        'metrics.last_viewed': new Date()
      };

      return await this.update(ID, updateData);
    } catch (error) {
      throw new Error(`View count update failed: ${error.message}`);
    }
  }

  async getContentStats() {
    try {
      return await this.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$count' },
            statuses: { 
              $push: { 
                status: '$_id', 
                count: '$count' 
              }
            }
          }
        }
      ]);
    } catch (error) {
      throw new Error(`Content stats failed: ${error.message}`);
    }
  }

  async getPopularContent(limit = 10) {
    try {
      const query = { status: 'published' };
      const options = {
        sort: { 'metrics.view_count': -1 },
        limit
      };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`Popular content query failed: ${error.message}`);
    }
  }

  // Helper methods
  generateSlug(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  async ensureUniqueSlug(baseSlug, excludeID = null) {
    try {
      let slug = baseSlug;
      let counter = 1;
      
      while (true) {
        const query = { slug };
        if (excludeID) {
          query.ID = { $ne: excludeID };
        }
        
        const existing = await this.findOne(query);
        if (!existing) {
          return slug;
        }
        
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    } catch (error) {
      throw new Error(`Slug generation failed: ${error.message}`);
    }
  }

  // Paginated methods
  async getPublishedPaginated(page = 1, limit = 10) {
    try {
      const query = { status: 'published' };
      const options = {
        page,
        limit,
        sort: { 'timestamps.published_at': -1 }
      };
      return await this.paginate(query, options);
    } catch (error) {
      throw new Error(`Paginated published content failed: ${error.message}`);
    }
  }

  async getByTypePaginated(type, page = 1, limit = 10) {
    try {
      const query = { type, status: 'published' };
      const options = {
        page,
        limit,
        sort: { 'timestamps.published_at': -1 }
      };
      return await this.paginate(query, options);
    } catch (error) {
      throw new Error(`Paginated content by type failed: ${error.message}`);
    }
  }
};
