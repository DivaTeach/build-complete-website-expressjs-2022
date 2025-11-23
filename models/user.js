const Base = require("./base");
const { User } = require("./schemas");
const crypto = require('crypto');

module.exports = class UserModel extends Base {
  constructor() {
    super(User);
  }

  // Override insert to handle user-specific logic
  async insert(data) {
    try {
      // Validate required fields
      if (!data.username || !data.email || !data.password_hash) {
        throw new Error('Username, email, and password are required');
      }

      // Check for existing username or email
      const existingUser = await this.model.findOne({
        $or: [
          { username: data.username },
          { email: data.email }
        ]
      });

      if (existingUser) {
        if (existingUser.username === data.username) {
          throw new Error('Username already exists');
        }
        if (existingUser.email === data.email) {
          throw new Error('Email already exists');
        }
      }

      // Set default values
      const userData = {
        role: 'contributor',
        status: 'pending',
        ...data
      };

      return await super.insert(userData);
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  // User-specific methods
  async findByUsername(username, options = {}) {
    try {
      return await this.findOne({ username }, options);
    } catch (error) {
      throw new Error(`Find user by username failed: ${error.message}`);
    }
  }

  async findByEmail(email, options = {}) {
    try {
      return await this.findOne({ email: email.toLowerCase() }, options);
    } catch (error) {
      throw new Error(`Find user by email failed: ${error.message}`);
    }
  }

  async findActive(options = {}) {
    try {
      const query = { status: 'active' };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`Find active users failed: ${error.message}`);
    }
  }

  async findByRole(role, options = {}) {
    try {
      const query = { role, status: { $ne: 'suspended' } };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`Find users by role failed: ${error.message}`);
    }
  }

  async findAdmins(options = {}) {
    try {
      const query = { 
        role: { $in: ['super_admin', 'admin'] },
        status: 'active'
      };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`Find admin users failed: ${error.message}`);
    }
  }

  async verifyEmail(userId) {
    try {
      const updateData = {
        email_verified_at: new Date(),
        email_verification_token: null,
        status: 'active' // Activate user upon email verification
      };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  async updateLastLogin(userId) {
    try {
      const updateData = {
        'activity.last_login': new Date(),
        'activity.last_active': new Date(),
        $inc: { 'activity.login_count': 1 }
      };
      
      return await this.model.findOneAndUpdate(
        { ID: userId },
        updateData,
        { new: true }
      );
    } catch (error) {
      throw new Error(`Update last login failed: ${error.message}`);
    }
  }

  async updateActivity(userId) {
    try {
      const updateData = {
        'activity.last_active': new Date()
      };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Update activity failed: ${error.message}`);
    }
  }

  async recordFailedLogin(identifier) {
    try {
      // Find user by username or email
      const user = await this.model.findOne({
        $or: [
          { username: identifier },
          { email: identifier.toLowerCase() }
        ]
      });

      if (user) {
        const updateData = {
          $inc: { 'activity.failed_login_attempts': 1 },
          'activity.last_failed_login': new Date()
        };
        
        await this.model.findOneAndUpdate({ ID: user.ID }, updateData);
      }
    } catch (error) {
      throw new Error(`Record failed login failed: ${error.message}`);
    }
  }

  async resetFailedLogins(userId) {
    try {
      const updateData = {
        'activity.failed_login_attempts': 0,
        'activity.last_failed_login': null
      };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Reset failed logins failed: ${error.message}`);
    }
  }

  async changePassword(userId, hashedPassword, salt) {
    try {
      const updateData = {
        password_hash: hashedPassword,
        salt: salt,
        'activity.password_changed_at': new Date()
      };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  async suspendUser(userId) {
    try {
      const updateData = { status: 'suspended' };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`User suspension failed: ${error.message}`);
    }
  }

  async activateUser(userId) {
    try {
      const updateData = { status: 'active' };
      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`User activation failed: ${error.message}`);
    }
  }

  async updateProfile(userId, profileData) {
    try {
      const updateData = {};
      
      // Handle nested profile updates
      Object.keys(profileData).forEach(key => {
        updateData[`profile.${key}`] = profileData[key];
      });

      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  async updateSettings(userId, settingsData) {
    try {
      const updateData = {};
      
      // Handle nested settings updates
      Object.keys(settingsData).forEach(key => {
        updateData[`settings.${key}`] = settingsData[key];
      });

      return await this.update(userId, updateData);
    } catch (error) {
      throw new Error(`Settings update failed: ${error.message}`);
    }
  }

  async getUserStats() {
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
      throw new Error(`User stats failed: ${error.message}`);
    }
  }

  async getRecentUsers(limit = 10) {
    try {
      const options = {
        sort: { created_at: -1 },
        limit,
        select: 'ID username email profile.display_name role status created_at'
      };
      return await this.getlist({}, options);
    } catch (error) {
      throw new Error(`Recent users query failed: ${error.message}`);
    }
  }

  async searchUsers(searchTerm, options = {}) {
    try {
      const query = {
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { 'profile.first_name': { $regex: searchTerm, $options: 'i' } },
          { 'profile.last_name': { $regex: searchTerm, $options: 'i' } },
          { 'profile.display_name': { $regex: searchTerm, $options: 'i' } }
        ]
      };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`User search failed: ${error.message}`);
    }
  }

  // Authentication helper methods
  async findForAuthentication(identifier) {
    try {
      return await this.model.findOne({
        $or: [
          { username: identifier },
          { email: identifier.toLowerCase() }
        ]
      }).select('+password_hash +salt');
    } catch (error) {
      throw new Error(`Find for authentication failed: ${error.message}`);
    }
  }

  async createEmailVerificationToken(userId) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const updateData = {
        email_verification_token: token
      };
      await this.update(userId, updateData);
      return token;
    } catch (error) {
      throw new Error(`Email verification token creation failed: ${error.message}`);
    }
  }

  async findByEmailVerificationToken(token) {
    try {
      return await this.findOne({ email_verification_token: token });
    } catch (error) {
      throw new Error(`Find by verification token failed: ${error.message}`);
    }
  }
};