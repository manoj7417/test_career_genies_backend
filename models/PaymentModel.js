const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    plan: {
        type: String,
        enum: ['CVSTUDIO', 'AICareerCoach', 'VirtualCoaching', 'PsychometricTestingTools', 'ADD-CREDITS'
        ]
    },
    planType: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    sessionId: { type: String, required: true },
    analyserTokens: {
        credits: { type: Number, default: 0 },
        expiry: { type: Date }
    },
    optimizerTokens: {
        credits: { type: Number, default: 0 },
        expiry: { type: Date }
    },
    jobCVTokens: {
        credits: { type: Number, default: 0 },
        expiry: { type: Date }
    },
    careerCounsellingTokens: {
        credits: { type: Number, default: 0 },
        expiry: { type: Date }
    },
    downloadCVTokens: {
        credits: { type: Number, default: 0 },
        expiry: { type: Date }
    },
    addCredits: {
        serviceName: { type: String, default: '' },
        credits: { type: Number, default: 0 }
    },
    expiryDate: { type: Date, required: true }
});

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { Payment };
