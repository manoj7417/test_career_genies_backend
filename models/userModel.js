const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const UserSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    stripeCustomerId: {
        type: String,
        trim: true,
        default: null
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: false,
        trim: true
    },
    phoneNumber: {
        country_code: {
            type: String,
            trim: true,
            default: ""
        },
        number: {
            type: String,
            trim: true,
            default: ''
        }
    },
    profilePicture: {
        type: String,
        trim: true,
        default: ''
    },
    bookings: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Booking"
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    occupation: {
        type: String,
        trim: true,
        default: ""
    },
    links: [{
        name: {
            type: String,
            trim: true,
            enum: ['facebook', 'twitter', 'linkedin', 'github', 'other'],
            default: 'other'
        },
        url: {
            type: String,
            trim: true,
            default: ''
        }
    }],
    role: {
        type: String,
        required: true,
        trim: true,
        enum: ['user', 'admin'],
        default: 'user',
    },
    subscription: {
        amount: { type: Number, default: 0 }, // Free for Basic, 10 for Lite, 15 for Premium
        currency: { type: String, required: true, default: 'GBP' }, // Changed to pound as mentioned
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['Active', 'Pending', 'Expired'], default: 'Active' },
        plan: {
            type: String,
            enum: ['Basic', 'Lite', 'Premium'],
            default: 'Basic'
        },
        planType: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
        currentPeriodStart: {
            type: Date,
            default: Date.now
        },
        currentPeriodEnd: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 1 month
        },
        coupon: {
            code: { type: String, default: null },
            applied: { type: Boolean, default: false },
            appliedDate: { type: Date, default: null },
            expiryDate: { type: Date, default: null } // For 6-month free access expiry
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        },
        canceledAt: {
            type: Date
        },
        stripeCheckoutSessionId: {
            type: String
        },
        stripeSubscriptionId: {
            type: String
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment"
        },
        // Feature access tokens based on plan tier
        analyserTokens: {
            credits: { type: Number, default: 1 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        optimizerTokens: {
            credits: { type: Number, default: 1 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        JobCVTokens: {
            credits: { type: Number, default: 1 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        careerCounsellingTokens: {
            credits: { type: Number, default: 1 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        downloadCVTokens: {
            credits: { type: Number, default: 1 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
    },
    payments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment"
    }],
    createdResumes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume"
    }],
    emailVerified: { type: Boolean, default: false },
    googleAuth: {
        googleId: { type: String, trim: true },
        isAuthorized: { type: Boolean, default: false },
        accessToken: { type: String, trim: true },
        refreshToken: { type: String, trim: true },
        tokenExpiry: { type: Date },
    },
    cv: {
        type: String,
        trim: true,
        default: ''
    }
},
    {
        timestamps: true
    })

UserSchema.pre("save", async function (next) {
    try {
        if (this.isModified('password') || this.isNew) {
            const salt = await bcrypt.genSalt(10)
            this.password = await bcrypt.hash(this.password, salt)
        }
    } catch (error) {
        next(error)
    }
})

UserSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password)
    } catch (error) {
        console.log(error)
        throw error;
    }
}

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateResetPassowordToken = function () {
    return jwt.sign(
        {
            userId: this._id
        },
        process.env.RESET_PASSWORD_SECRET,
        {
            expiresIn: process.env.RESET_PASSWORD_EXPIRY
        }
    )
}

// Helper method to apply coupon
UserSchema.methods.applyCoupon = function (couponCode) {
    // Set coupon details
    this.subscription.coupon.code = couponCode;
    this.subscription.coupon.applied = true;
    this.subscription.coupon.appliedDate = new Date();

    // Set 6-month expiry date
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    this.subscription.coupon.expiryDate = sixMonthsFromNow;

    // Update subscription period
    this.subscription.currentPeriodStart = new Date();
    this.subscription.currentPeriodEnd = sixMonthsFromNow;

    // Set amount to 0 for free access
    this.subscription.amount = 0;

    return this;
}

// Helper to check if coupon is valid/active
UserSchema.methods.isCouponActive = function () {
    if (!this.subscription.coupon.applied) return false;

    const now = new Date();
    return this.subscription.coupon.expiryDate > now;
}

// Helper to update tokens based on plan type
UserSchema.methods.updatePlanTokens = function () {
    const plan = this.subscription.plan;

    // Reset all tokens first
    this.subscription.analyserTokens.credits = 0;
    this.subscription.optimizerTokens.credits = 0;
    this.subscription.JobCVTokens.credits = 0;
    this.subscription.careerCounsellingTokens.credits = 0;
    this.subscription.downloadCVTokens.credits = 0;

    // Set tokens based on plan
    switch (plan) {
        case 'Basic':
            this.subscription.analyserTokens.credits = 1;
            this.subscription.downloadCVTokens.credits = 1;
            break;
        case 'Lite':
            this.subscription.analyserTokens.credits = 100;
            this.subscription.optimizerTokens.credits = 100;
            this.subscription.JobCVTokens.credits = 100;
            this.subscription.careerCounsellingTokens.credits = 100;
            this.subscription.downloadCVTokens.credits = 100;
            break;
        case 'Premium':
            this.subscription.analyserTokens.credits = 100;
            this.subscription.optimizerTokens.credits = 100;
            this.subscription.JobCVTokens.credits = 100;
            this.subscription.careerCounsellingTokens.credits = 100;
            this.subscription.downloadCVTokens.credits = 100;
            break;
    }

    return this;
}

UserSchema.methods.toSafeObject = function () {
    return {
        fullname: this.fullname,
        email: this.email,
        _id: this._id,
        role: this.role,
        subscription: this.subscription,
        createdResumes: this.createdResumes,
        profilePicture: this.profilePicture,
        address: this.address,
        occupation: this.occupation,
        phoneNumber: this.phoneNumber,
        googleAuth: this.googleAuth,
        trial: this.trial,
        cv: this.cv,
    };
};

const User = mongoose.model("User", UserSchema)

module.exports = { User };