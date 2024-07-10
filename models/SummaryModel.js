const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    summary: {
        strengths: { type: String, required: true },
        weaknesses: { type: String, required: true },
        interests: { type: String, required: true },
        values: { type: String, required: true }
    },
    careerSuggestions: [
        {
            career: { type: String, required: true },
            reason: { type: String, required: true },
            actions: { type: String, required: true }
        }
    ],
    actionableInsights: {
        training: { type: String, required: true },
        skillDevelopment: { type: String, required: true }
    }
})

const Summary = mongoose.model('Summary', summarySchema)

module.exports = { Summary }