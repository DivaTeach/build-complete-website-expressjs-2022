const config = {
  local: {
    mode: "local",
    port: 3000,
    mongo: {
      host: "127.0.0.1",
      port: "27017",
      database: "content_management_db",
      uri: "mongodb://127.0.0.1:27017/content_management_db",
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      }
    },
  },
  staging: {
    mode: "staging",
    port: 4000,
    mongo: {
      host: "127.0.0.1",
      port: "27017",
      database: "content_management_db_staging",
      uri: "mongodb://127.0.0.1:27017/content_management_db_staging",
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      }
    },
  },
  production: {
    mode: "production",
    port: 5000,
    mongo: {
      host: "127.0.0.1",
      port: "27017",
      database: "content_management_db_prod",
      uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/content_management_db_prod",
      options: {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      }
    },
  },
};
module.exports = function (mode) {
  return config[mode || process.argv[2] || "local"] || config.local;
};
