const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required']
    },
    company: {
        type: String,
        required: [true, 'Company name is required']
    },
    workType: {
        type: String,
        enum: ['remote', 'hybrid', 'onsite'],
        required: [true, 'Work type is required']
    },
    location: {
        type: String,
        required: [true, 'Job location is required']
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        required: [true, 'Job type is required']
    },
    description: {
        type: String,
        required: [true, 'Job description is required']
    },
    requirements: [{
        type: String,
        required: [true, 'Job requirements are required']
    }],
    salary: {
        min: {
            type: Number,
            required: [true, 'Minimum salary is required']
        },
        max: {
            type: Number,
            required: [true, 'Maximum salary is required']
        },
        currency: {
            type: String,
            enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
            default: 'USD'
        }
    },
    recruiter: {
        type: mongoose.Schema.ObjectId,
        ref: 'Recruiter',
        required: [true, 'Job must belong to a recruiter']
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    },
    closureDetails: {
        candidateFound: {
            type: Boolean,
            default: false
        },
        closureReason: {
            type: String,
            enum: ['hired', 'cancelled', 'position_filled', 'other'],
            default: null
        },
        closureNote: {
            type: String,
            trim: true,
            default: ''
        },
        closedAt: {
            type: Date,
            default: null
        }
    },
    applications: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'accepted', 'rejected'],
            default: 'pending'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add text index for search functionality
jobSchema.index({ 
    title: 'text', 
    description: 'text',
    company: 'text'
});

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;