const mongoose = require('mongoose')
require('dotenv').config()


const DBConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGOURL, {
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds socket timeout
            connectTimeoutMS: 10000, // 10 seconds connection timeout
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        })
        console.log("Connected to Database")
    } catch (error) {
        console.error("Error connecting to database", error)
        // Don't throw - let server start even if DB connection fails
        // The server can still respond to health checks
    }
}

module.exports = DBConnection