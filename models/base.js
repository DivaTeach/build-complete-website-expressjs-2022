const mongoose = require('mongoose');

module.exports = class BaseModel {
  constructor(model) {
    this.model = model;
  }

  // Create a new document
  async insert(data) {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  // Update a document by ID
  async update(ID, data) {
    try {
      const updatedDocument = await this.model.findOneAndUpdate(
        { ID },
        { $set: data },
        { new: true, runValidators: true }
      );
      
      if (!updatedDocument) {
        throw new Error('Document not found');
      }
      
      return updatedDocument;
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  // Get a list of documents with optional query
  async getlist(query = {}, options = {}) {
    try {
      const {
        sort = { 'timestamps.created_at': -1 },
        limit = null,
        skip = 0,
        populate = null,
        select = null
      } = options;

      let queryBuilder = this.model.find(query);
      
      if (select) queryBuilder = queryBuilder.select(select);
      if (populate) queryBuilder = queryBuilder.populate(populate);
      if (sort) queryBuilder = queryBuilder.sort(sort);
      if (skip) queryBuilder = queryBuilder.skip(skip);
      if (limit) queryBuilder = queryBuilder.limit(limit);
      
      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`Get list failed: ${error.message}`);
    }
  }

  // Get a single document by ID
  async findById(ID, options = {}) {
    try {
      const { populate = null, select = null } = options;
      
      let queryBuilder = this.model.findOne({ ID });
      
      if (select) queryBuilder = queryBuilder.select(select);
      if (populate) queryBuilder = queryBuilder.populate(populate);
      
      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`Find by ID failed: ${error.message}`);
    }
  }

  // Get a single document by query
  async findOne(query, options = {}) {
    try {
      const { populate = null, select = null } = options;
      
      let queryBuilder = this.model.findOne(query);
      
      if (select) queryBuilder = queryBuilder.select(select);
      if (populate) queryBuilder = queryBuilder.populate(populate);
      
      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`Find one failed: ${error.message}`);
    }
  }

  // Remove a document by ID
  async remove(ID) {
    try {
      const deletedDocument = await this.model.findOneAndDelete({ ID });
      
      if (!deletedDocument) {
        throw new Error('Document not found');
      }
      
      return deletedDocument;
    } catch (error) {
      throw new Error(`Remove failed: ${error.message}`);
    }
  }

  // Count documents with optional query
  async count(query = {}) {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      throw new Error(`Count failed: ${error.message}`);
    }
  }

  // Check if document exists
  async exists(query) {
    try {
      const document = await this.model.findOne(query).select('_id').lean();
      return !!document;
    } catch (error) {
      throw new Error(`Exists check failed: ${error.message}`);
    }
  }

  // Paginated results
  async paginate(query = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { 'timestamps.created_at': -1 },
        populate = null,
        select = null
      } = options;

      const skip = (page - 1) * limit;
      
      const [documents, total] = await Promise.all([
        this.getlist(query, { sort, limit, skip, populate, select }),
        this.count(query)
      ]);

      return {
        documents,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_documents: total,
          per_page: limit,
          has_next_page: page < Math.ceil(total / limit),
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Pagination failed: ${error.message}`);
    }
  }

  // Bulk operations
  async bulkInsert(documents) {
    try {
      return await this.model.insertMany(documents);
    } catch (error) {
      throw new Error(`Bulk insert failed: ${error.message}`);
    }
  }

  async bulkUpdate(updates) {
    try {
      const operations = updates.map(({ filter, update }) => ({
        updateOne: {
          filter,
          update: { $set: update },
          upsert: false
        }
      }));
      
      return await this.model.bulkWrite(operations);
    } catch (error) {
      throw new Error(`Bulk update failed: ${error.message}`);
    }
  }

  // Search with text index
  async search(searchTerm, options = {}) {
    try {
      const {
        limit = 10,
        skip = 0,
        populate = null,
        select = null
      } = options;

      let queryBuilder = this.model.find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
      
      if (select) queryBuilder = queryBuilder.select(select);
      if (populate) queryBuilder = queryBuilder.populate(populate);
      if (skip) queryBuilder = queryBuilder.skip(skip);
      if (limit) queryBuilder = queryBuilder.limit(limit);
      
      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Aggregate queries
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw new Error(`Aggregation failed: ${error.message}`);
    }
  }
};
