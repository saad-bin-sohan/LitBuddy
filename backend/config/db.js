// backend/config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Connect to MongoDB using connection string from .env
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process if DB connection fails
    }
};

module.exports = connectDB;
