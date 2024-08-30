const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    ratings: {
        type: Number,
        required: true,
    },
    students: {
        type: Number,
        required: true,
        default: 0
    },
    courses: [],
    socialLinks: [{
        name: { type: String, required: true, trim: true },
        link: { type: String, required: true, trim: true }
    }],
    description: { type: String, required: true, trim: true },
    blogs: []
}, {
    timestamps: true
});

const Coach = mongoose.model("Coach", coachSchema);

module.exports = { Coach };
