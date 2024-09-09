const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const coachSchema = new mongoose.Schema({
    name: {
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
        minlength: 8,
        trim: true
    },
    phoneNumber: {
        type: String, required: true
    },
    picture: {
        type: String,
        required: false
    },
    profession: {
        type: String,
        required: false,
        trim: true
    },
    bioInfo: {
        type: String,
        required: false
    },
    bankDetails: {
        accountNumber: { type: String },
        code: {
            name: { type: String },
            value: { type: String }
        }
    },
    categories: {
        type: [String],
        required: false
    },
    coachingType: {
        type: [String],
        required: false
    },
    coachingDescription: {
        type: String,
        trim: false
    },
    ratesPerHour: {
        amount: { type: Number, required: false },
        currency: { type: String, required: false, enum: ['USD', 'EUR', 'GBP', 'INR'] }
    },
    ratings: {
        type: Number,
    },
    students: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
    },
    courses: [],
    socialLinks: [{
        name: { type: String, required: false, trim: true },
        link: { type: String, required: false, trim: true }
    }],
    description: { type: String, required: false, trim: true },
    blogs: [],
    availability: {
        dayOfWeek: {
            type: [String],
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        slots: [{
            startTime: {
                type: String
            },
            endTime: {
                type: String
            },
        }],
        isRecurring: {
            type: Boolean,
            default: false
        },
        unavailableDates: {
            type: [Date],
            default: []
        },
        customSlots: [{
            date: { type: Date },
            slots: [{
                startTime: {
                    type: String
                },
                endTime: {
                    type: String
                },
                isBooked: {
                    type: Boolean,
                    default: false
                }
            }]
        }]
    },
    bookedSlots: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Booking",
        default: []
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    documents: [{
        name: { type: String }
    }]
}, {
    timestamps: true
});

coachSchema.pre("save", async function (next) {
    try {
        if (this.isModified('password') || this.isNew) {
            const salt = await bcrypt.genSalt(10)
            this.password = await bcrypt.hash(this.password, salt)
        }
    } catch (error) {
        next(error)
    }
})

coachSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password)
    } catch (error) {
        console.log(error)
        throw error;
    }
}

coachSchema.methods.generateAccessToken = function () {
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

coachSchema.methods.generateRefreshToken = function () {
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

coachSchema.methods.toSafeObject = function () {
    return {
        name: this.name,
        email: this.email,
        _id: this._id,
        picture: this.picture,
        profession: this.profession,
        bioInfo: this.bioInfo,
        bankDetails: this.bankDetails,
        coachingType: this.coachingType,
        coachingDescription: this.coachingDescription,
        ratesPerHour: this.ratesPerHour,
        phoneNumber: this.phoneNumber,
        ratings: this.ratings,
        students: this.students,
        courses: this.courses,
        socialLinks: this.socialLinks,
        description: this.description,
        blogs: this.blogs,
        availability: this.availability,
        isApproved: this.isApproved,
        createdAt: this.createdAt,
    };
};

coachSchema.methods.generateResetPasswordToken = function () {
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


const Coach = mongoose.model("Coach", coachSchema);

module.exports = { Coach };
