const ContentModel = require('./content');
const UserModel = require('./user');
const SettingsModel = require('./settings');

// Export model instances
module.exports = {
  Content: new ContentModel(),
  User: new UserModel(),
  Settings: new SettingsModel()
};