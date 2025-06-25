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
        amount: { type: Number, default: 0 },
        currency: { type: String, required: true, default: 'USD' },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
        plan: {
            type: [{
                type: String,
                enum: ['CVSTUDIO', 'AICareerCoach', 'VirtualCoaching', 'PsychometricTestingTools', 'Trial14', 'Basic', 'Lite', 'Premium'],
                default: 'CVSTUDIO'
            }],
            default: ['CVSTUDIO', 'Basic']
        },
        planType: { type: String, enum: ['monthly', 'yearly', 'coupon', 'discounted', 'trial'], default: 'monthly' },
        currentPeriodStart: {
            type: Date
        },
        currentPeriodEnd: {
            type: Date
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
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment"
        },
        analyserTokens: {
            credits: { type: Number, default: 0 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        optimizerTokens: {
            credits: { type: Number, default: 0 },
            expiry: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        },
        JobCVTokens: {
            credits: { type: Number, default: 0 },
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

// Method to check and reset expired credits
UserSchema.methods.checkAndResetExpiredCredits = function () {
    const currentDate = new Date();
    let needsUpdate = false;

    // Check if trial has expired
    if (this.subscription?.trialExpiryDate && this.subscription.trialExpiryDate < currentDate) {
        if (this.subscription.planType === 'trial' && (
            this.subscription.analyserTokens?.credits > 0 ||
            this.subscription.optimizerTokens?.credits > 0 ||
            this.subscription.JobCVTokens?.credits > 0 ||
            this.subscription.careerCounsellingTokens?.credits > 0 ||
            this.subscription.downloadCVTokens?.credits > 0
        )) {
            this.subscription.analyserTokens.credits = 0;
            this.subscription.optimizerTokens.credits = 0;
            this.subscription.JobCVTokens.credits = 0;
            this.subscription.careerCounsellingTokens.credits = 0;
            this.subscription.downloadCVTokens.credits = 0;
            needsUpdate = true;
        }
    }

    // Check if coupon has expired
    if (this.subscription?.couponExpiryDate && this.subscription.couponExpiryDate < currentDate) {
        if (this.subscription.planType === 'coupon' && (
            this.subscription.analyserTokens?.credits > 0 ||
            this.subscription.optimizerTokens?.credits > 0 ||
            this.subscription.JobCVTokens?.credits > 0 ||
            this.subscription.careerCounsellingTokens?.credits > 0 ||
            this.subscription.downloadCVTokens?.credits > 0
        )) {
            this.subscription.analyserTokens.credits = 0;
            this.subscription.optimizerTokens.credits = 0;
            this.subscription.JobCVTokens.credits = 0;
            this.subscription.careerCounsellingTokens.credits = 0;
            this.subscription.downloadCVTokens.credits = 0;
            needsUpdate = true;
        }
    }

    // Check if discounted plan has expired
    if (this.subscription?.planType === 'discounted' && this.subscription?.currentPeriodEnd && this.subscription.currentPeriodEnd < currentDate) {
        if (this.subscription.analyserTokens?.credits > 0 ||
            this.subscription.optimizerTokens?.credits > 0 ||
            this.subscription.JobCVTokens?.credits > 0 ||
            this.subscription.careerCounsellingTokens?.credits > 0 ||
            this.subscription.downloadCVTokens?.credits > 0
        ) {
            this.subscription.analyserTokens.credits = 0;
            this.subscription.optimizerTokens.credits = 0;
            this.subscription.JobCVTokens.credits = 0;
            this.subscription.careerCounsellingTokens.credits = 0;
            this.subscription.downloadCVTokens.credits = 0;
            needsUpdate = true;
        }
    }

    // Check individual token expiry dates (for regular paid plans)
    if (this.subscription?.analyserTokens?.expiry && this.subscription.analyserTokens.expiry < currentDate) {
        if (this.subscription.analyserTokens.credits > 0) {
            this.subscription.analyserTokens.credits = 0;
            needsUpdate = true;
        }
    }

    if (this.subscription?.optimizerTokens?.expiry && this.subscription.optimizerTokens.expiry < currentDate) {
        if (this.subscription.optimizerTokens.credits > 0) {
            this.subscription.optimizerTokens.credits = 0;
            needsUpdate = true;
        }
    }

    if (this.subscription?.JobCVTokens?.expiry && this.subscription.JobCVTokens.expiry < currentDate) {
        if (this.subscription.JobCVTokens.credits > 0) {
            this.subscription.JobCVTokens.credits = 0;
            needsUpdate = true;
        }
    }

    if (this.subscription?.careerCounsellingTokens?.expiry && this.subscription.careerCounsellingTokens.expiry < currentDate) {
        if (this.subscription.careerCounsellingTokens.credits > 0) {
            this.subscription.careerCounsellingTokens.credits = 0;
            needsUpdate = true;
        }
    }

    if (this.subscription?.downloadCVTokens?.expiry && this.subscription.downloadCVTokens.expiry < currentDate) {
        if (this.subscription.downloadCVTokens.credits > 0) {
            this.subscription.downloadCVTokens.credits = 0;
            needsUpdate = true;
        }
    }

    return needsUpdate;
};

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

        cv: this.cv,
    };
};

const User = mongoose.model("User", UserSchema)

module.exports = { User };