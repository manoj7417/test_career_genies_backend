const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    resumeContent: { type: String, required: true },
    analysis: {
        resume_score: {
            type: Number,
            required: true
        },
        feedback: {
            type: [String],
            required: true
        }
    },
    relevancy: {
        score: {
            type: Number,
            required: true
        },
        pointers: {
            type: [String],
            required: true
        }
    },
    clarity: {
        score: {
            type: Number,
            required: true
        },
        pointers: {
            type: [String],
            required: true
        }
    },
    content_quality: {
        score: {
            type: Number,
            required: true
        },
        pointers: {
            type: [String],
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Analysis = mongoose.model("Analysis", analysisSchema);

module.exports = { Analysis };
