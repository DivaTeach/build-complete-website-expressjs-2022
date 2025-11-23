const Base = require("./base");
const { Settings } = require("./schemas");

module.exports = class SettingsModel extends Base {
  constructor() {
    super(Settings);
  }

  // Get a setting value by key
  async getSetting(key) {
    try {
      const setting = await this.findOne({ key });
      return setting ? setting.value : null;
    } catch (error) {
      throw new Error(`Get setting failed: ${error.message}`);
    }
  }

  // Set a setting value
  async setSetting(key, value, userId = null) {
    try {
      const setting = await this.findOne({ key });
      
      if (!setting) {
        throw new Error(`Setting '${key}' not found`);
      }

      // Validate the value
      if (!setting.validateValue(value)) {
        throw new Error(`Invalid value for setting '${key}'`);
      }

      const updateData = {
        value,
        updated_by: userId,
        updated_at: new Date()
      };

      return await this.model.findOneAndUpdate(
        { key },
        updateData,
        { new: true }
      );
    } catch (error) {
      throw new Error(`Set setting failed: ${error.message}`);
    }
  }

  // Get settings by category
  async getSettingsByCategory(category) {
    try {
      return await this.getlist({ category }, { sort: { label: 1 } });
    } catch (error) {
      throw new Error(`Get settings by category failed: ${error.message}`);
    }
  }

  // Get editable settings
  async getEditableSettings() {
    try {
      return await this.getlist(
        { editable: true }, 
        { sort: { category: 1, label: 1 } }
      );
    } catch (error) {
      throw new Error(`Get editable settings failed: ${error.message}`);
    }
  }

  // Get settings by access level
  async getSettingsByAccessLevel(accessLevel) {
    try {
      const levels = {
        'public': ['public'],
        'admin': ['public', 'admin'],
        'super_admin': ['public', 'admin', 'super_admin']
      };
      
      const allowedLevels = levels[accessLevel] || ['public'];
      
      return await this.getlist(
        { access_level: { $in: allowedLevels } },
        { sort: { category: 1, label: 1 } }
      );
    } catch (error) {
      throw new Error(`Get settings by access level failed: ${error.message}`);
    }
  }

  // Get public settings (for frontend)
  async getPublicSettings() {
    try {
      const settings = await this.getlist(
        { access_level: 'public' },
        { 
          sort: { category: 1, label: 1 },
          select: 'key value type category label'
        }
      );

      // Convert to key-value object for easier frontend consumption
      const publicSettings = {};
      settings.forEach(setting => {
        publicSettings[setting.key] = setting.value;
      });

      return publicSettings;
    } catch (error) {
      throw new Error(`Get public settings failed: ${error.message}`);
    }
  }

  // Bulk update settings
  async bulkUpdateSettings(settingsData, userId = null) {
    try {
      const results = [];
      
      for (const [key, value] of Object.entries(settingsData)) {
        try {
          const result = await this.setSetting(key, value, userId);
          results.push({ key, success: true, result });
        } catch (error) {
          results.push({ key, success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Bulk update settings failed: ${error.message}`);
    }
  }

  // Reset setting to default
  async resetSettingToDefault(key) {
    try {
      const setting = await this.findOne({ key });
      
      if (!setting) {
        throw new Error(`Setting '${key}' not found`);
      }

      if (setting.default_value === undefined) {
        throw new Error(`Setting '${key}' has no default value`);
      }

      return await this.model.findOneAndUpdate(
        { key },
        { 
          value: setting.default_value,
          updated_at: new Date()
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Reset setting to default failed: ${error.message}`);
    }
  }

  // Create a new setting
  async createSetting(settingData) {
    try {
      // Check if setting already exists
      const existing = await this.findOne({ key: settingData.key });
      if (existing) {
        throw new Error(`Setting '${settingData.key}' already exists`);
      }

      // Validate required fields
      if (!settingData.key || !settingData.label || !settingData.type || !settingData.category) {
        throw new Error('Key, label, type, and category are required');
      }

      // Set default values
      const newSetting = {
        access_level: 'admin',
        editable: true,
        ...settingData
      };

      return await super.insert(newSetting);
    } catch (error) {
      throw new Error(`Create setting failed: ${error.message}`);
    }
  }

  // Get settings grouped by category
  async getSettingsGroupedByCategory(accessLevel = 'public') {
    try {
      const settings = await this.getSettingsByAccessLevel(accessLevel);
      
      const grouped = {};
      settings.forEach(setting => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = [];
        }
        grouped[setting.category].push(setting);
      });

      return grouped;
    } catch (error) {
      throw new Error(`Get grouped settings failed: ${error.message}`);
    }
  }

  // Search settings
  async searchSettings(searchTerm, options = {}) {
    try {
      const query = {
        $or: [
          { key: { $regex: searchTerm, $options: 'i' } },
          { label: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } }
        ]
      };
      return await this.getlist(query, options);
    } catch (error) {
      throw new Error(`Settings search failed: ${error.message}`);
    }
  }

  // Validate setting value before update
  async validateSettingValue(key, value) {
    try {
      const setting = await this.findOne({ key });
      
      if (!setting) {
        return { valid: false, error: `Setting '${key}' not found` };
      }

      const isValid = setting.validateValue(value);
      
      return { 
        valid: isValid, 
        error: isValid ? null : `Invalid value for setting '${key}'` 
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Initialize default settings (called during app startup)
  async initializeDefaults() {
    try {
      return await this.model.initializeDefaults();
    } catch (error) {
      throw new Error(`Initialize default settings failed: ${error.message}`);
    }
  }

  // Export settings for backup
  async exportSettings() {
    try {
      const settings = await this.getlist({}, { 
        select: 'key value type category label description default_value validation access_level editable'
      });
      
      return settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        type: setting.type,
        category: setting.category,
        label: setting.label,
        description: setting.description,
        default_value: setting.default_value,
        validation: setting.validation,
        access_level: setting.access_level,
        editable: setting.editable
      }));
    } catch (error) {
      throw new Error(`Export settings failed: ${error.message}`);
    }
  }

  // Import settings from backup
  async importSettings(settingsArray, overwriteExisting = false) {
    try {
      const results = [];
      
      for (const settingData of settingsArray) {
        try {
          const existing = await this.findOne({ key: settingData.key });
          
          if (existing && !overwriteExisting) {
            results.push({ 
              key: settingData.key, 
              success: false, 
              error: 'Setting exists and overwrite disabled' 
            });
            continue;
          }

          if (existing) {
            // Update existing setting
            await this.model.findOneAndUpdate(
              { key: settingData.key },
              settingData,
              { new: true }
            );
          } else {
            // Create new setting
            await this.createSetting(settingData);
          }
          
          results.push({ key: settingData.key, success: true });
        } catch (error) {
          results.push({ 
            key: settingData.key, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Import settings failed: ${error.message}`);
    }
  }
};