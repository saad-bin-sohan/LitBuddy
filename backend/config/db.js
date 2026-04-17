// backend/config/db.js

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    // Connect to MongoDB using connection string from .env
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
    });

    logger.info({ host: conn.connection.host }, 'mongodb.connected');
  } catch (error) {
    logger.fatal({ err: error }, 'mongodb.connection_failed');
    process.exit(1); // Exit process if DB connection fails
  }
};

module.exports = connectDB;
