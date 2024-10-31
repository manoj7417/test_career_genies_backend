const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
    },
    slotTime: {
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        }
    },
    timezone: {
        type: String, required: true
    },
    country: {
        type: String, required: true
    },
    city: {
        type: String, required: true
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'booked', 'cancelled'],
        default: 'pending'
    },
    sessionId: { type: String, required: true }
}, { timestamps: true });

const Booking = mongoose.model('Booking', BookingSchema);

module.exports = { Booking };
