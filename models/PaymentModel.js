const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    originalAmount: {
        type: Number,
        required: false,
        default: null
    }, // To track original price before coupon
    currency: {
        type: String,
        required: true,
        default: 'GBP' // Changed to GBP from USD
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Ready for Charge'],
        default: 'Pending'
    },
    plan: {
        type: String,
        enum: ['Basic', 'Lite', 'Premium', 'ADD-CREDITS'],
        required: true
    },
    planType: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    coupon: {
        applied: { type: Boolean, default: false },
        code: { type: String, default: null },
        discount: { type: Number, default: 0 }, // Amount discounted
        appliedDate: { type: Date, default: null },
        expiryDate: { type: Date, default: null } // When coupon benefits expire
    },
    sessionId: {
        type: String,
        required: false
    },
    setupIntentId: {
        type: String,
        required: false
    },
    stripePaymentIntentId: {
        type: String,
        required: false
    },
    stripeSubscriptionId: {
        type: String,
        required: false
    },
    // Features included in this payment
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
    billingPeriodStart: {
        type: Date,
        default: Date.now
    },
    billingPeriodEnd: {
        type: Date,
        required: true
    },
    nextBillingDate: {
        type: Date,
        required: false
    }
});

// Helper method to apply tokens based on plan type
PaymentSchema.methods.setTokensByPlan = function () {
    // Set tokens based on plan
    switch (this.plan) {
        case 'Basic':
            this.analyserTokens.credits = 1;
            this.downloadCVTokens.credits = 1;
            break;
        case 'Lite':
            this.analyserTokens.credits = 5;
            this.optimizerTokens.credits = 3;
            this.jobCVTokens.credits = 3;
            this.careerCounsellingTokens.credits = 1;
            this.downloadCVTokens.credits = 3;
            break;
        case 'Premium':
            this.analyserTokens.credits = 10;
            this.optimizerTokens.credits = 10;
            this.jobCVTokens.credits = 10;
            this.careerCounsellingTokens.credits = 5;
            this.downloadCVTokens.credits = 10;
            break;
    }

    // Set expiry date for tokens
    const expiryDate = new Date();
    if (this.planType === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (this.planType === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    this.analyserTokens.expiry = expiryDate;
    this.optimizerTokens.expiry = expiryDate;
    this.jobCVTokens.expiry = expiryDate;
    this.careerCounsellingTokens.expiry = expiryDate;
    this.downloadCVTokens.expiry = expiryDate;

    return this;
};

// Helper method to apply coupon
PaymentSchema.methods.applyCoupon = function (couponCode) {
    // Store original amount before discount
    this.originalAmount = this.amount;

    // Apply coupon (6 months free)
    this.coupon.applied = true;
    this.coupon.code = couponCode;
    this.coupon.appliedDate = new Date();

    // Set coupon expiry to 6 months from now
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    this.coupon.expiryDate = sixMonthsFromNow;

    // Set amount to 0 (free)
    this.amount = 0;
    this.coupon.discount = this.originalAmount;

    // Update billing period
    this.billingPeriodStart = new Date();
    this.billingPeriodEnd = sixMonthsFromNow;
    this.nextBillingDate = sixMonthsFromNow;

    return this;
};

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { Payment };