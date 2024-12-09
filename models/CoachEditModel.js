const mongoose = require('mongoose');

const coachEditSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String, required: true
    },
    profileImage: {
        type: String,
        required: false
    },
    profileVideo: {
        url: { type: String, required: false },
        isApproved: { type: Boolean, default: false }
    },
    address: {
        type: String
    },
    country: {
        type: String
    },
    city: {
        type: String
    },
    zip: {
        type: String
    },
    cv: {
        link: { type: String },
        isVerified: { type: Boolean, default: false }
    },
    signedAggrement: {
        link: { type: String },
        isVerified: { type: Boolean, default: false }
    },
    experience: {
        type: Number
    },
    typeOfCoaching: {
        type: String
    },
    skills: {
        type: String
    },
    dateofBirth: {
        type: Date
    },
    placeofBirth: {
        type: String
    },
    profession: {
        type: String,
        required: false,
        trim: true
    },
    bio: {
        type: String,
        required: false
    },
    bankDetails: {
        accountNumber: { type: String },
        code: {
            name: { type: String },
            value: { type: String }
        },
        bankName: {
            type: String
        }
    },
    categories: {
        type: String,
        required: false
    },
    coachingDescription: {
        type: String,
        trim: false
    },
    address: {
        type: String
    },
    ratings: {
        type: Number,
    },
    socialLinks: [{
        name: { type: String, required: false, trim: true, enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'other'], default: 'other' },
        link: { type: String, required: false, trim: true }
    }],
    description: { type: String, required: false, trim: true },
    isRequestApproved: {
        type: Boolean,
        required: true,
        default: false
    },
    approvalStatus: { type: String, required: false, enum: ['Pending', 'Approved', 'Rejected'] },
    rejectionReason: { type: String, required: false },
}, { timestamps: true })

const CoachEdit = mongoose.model('CoachEdit', coachEditSchema)

module.exports = { CoachEdit }