const mongoose = require('mongoose');
const config = require('../config')();

// Test Mongoose connection and models
async function testMongooseSetup() {
  try {
    console.log('Testing Mongoose setup...');
    
    // Connect to database
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    console.log('✅ Connected to MongoDB successfully');
    
    // Test schemas
    const { Content, User, Settings } = require('../models/schemas');
    console.log('✅ Schemas loaded successfully');
    
    // Test models
    const Models = require('../models');
    console.log('✅ Models loaded successfully');
    
    // Test basic operations
    console.log('\nTesting basic model operations...');
    
    // Initialize default settings
    await Settings.initializeDefaults();
    console.log('✅ Default settings initialized');
    
    // Test settings retrieval
    const settings = await Models.Settings.getPublicSettings();
    console.log('✅ Public settings retrieved:', Object.keys(settings).length, 'settings');
    
    // Test content model
    const contentStats = await Models.Content.getContentStats();
    console.log('✅ Content stats retrieved');
    
    console.log('\n🎉 All tests passed! Mongoose setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testMongooseSetup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = testMongooseSetup;