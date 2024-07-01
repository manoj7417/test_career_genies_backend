const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const UserSchema = new mongoose.Schema({
    fullname: {
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
        default: 'https://static.vecteezy.com/system/resources/previews/004/991/321/original/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg'
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
            default: ''
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
        plan: {
            type: String,
            enum: ['free', 'basic', 'premium'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['Pending', 'Active', 'Canceled', 'Incomplete', 'Incomplete_expired', 'Trialing', 'Unpaid', 'Past_due'],
            default: 'Pending'
        },
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
        }
    },
    createdResumes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume"
    }],
    tokens: { type: Number, default: 0 }
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

const User = mongoose.model("User", UserSchema)

module.exports = { User };