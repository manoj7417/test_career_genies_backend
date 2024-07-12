const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    plan: {
        type: String,
        enum: ['basic', 'premium'],
        default: 'basic'
    },
    planType: { type: String, enum: ['monthly', 'yearly'], default: '' },
    sessionId: { type: String, required: true },
    analyserTokens: { type: Number, default: 0 },
    optimizerTokens: { type: Number, default: 0 },
    jobCVTokens: { type: Number, default: 0 },
    careerCounsellingTokens: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true }
});

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { Payment };
