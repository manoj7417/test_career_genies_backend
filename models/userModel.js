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
        plan: [
            {
                type: String,
                enum: ['CVSTUDIO', 'AICareerCoach', 'VirtualCoaching', 'PsychometricTestingTools'
                ],
                default: "CVSTUDIO"
            }
        ],
        planType: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
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
            credits: { type: Number, default: 0 },
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
    };
};

const User = mongoose.model("User", UserSchema)

module.exports = { User };