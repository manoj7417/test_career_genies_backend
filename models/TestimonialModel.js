const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    review: {
        type: String,
        required: true,
        maxlength: 1000,
    },

}, {
    timestamps: true
});


const Testimonial = mongoose.model('Testimonial', TestimonialSchema);

module.exports = { Testimonial };