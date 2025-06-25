#!/usr/bin/env node

// Standalone script to reset expired credits
// Usage: node scripts/resetExpiredCredits.js

require('dotenv').config();
const mongoose = require('mongoose');
const { resetAllExpiredCredits } = require('../utils/creditUtils');

const runResetScript = async () => {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/career_genies');
        console.log('Connected to MongoDB successfully');

        // Run the reset function
        console.log('Starting reset of expired credits...');
        const result = await resetAllExpiredCredits();

        if (result.success) {
            console.log(`✅ Successfully reset expired credits for ${result.updatedUsers} users`);
        } else {
            console.error(`❌ Failed to reset expired credits: ${result.error}`);
        }

        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed');

        // Exit the process
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running reset script:', error);
        process.exit(1);
    }
};

// Run the script
runResetScript(); 