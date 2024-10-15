const mongoose = require('mongoose');

// Define the schema for the Coach
const coachPaymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    currency: { type: String, required: true, default: 'USD' },
    date: { type: Date, default: Date.now },
    coachId : { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
    programId : { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    sessionId : { type: String, required: true }
});

const CoachPayment = mongoose.model('CoachPayment', coachPaymentSchema);

module.exports = { CoachPayment };