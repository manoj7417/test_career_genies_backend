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
    phone: {
        type: String, required: true
    },
    profileImage: {
        type: String,
        required: false
    },
    profileVideo: {
        url: { type: String, required: false },
        isApproved: { type: Boolean, default: false }
    },
    address: {
        type: String
    },
    country: {
        type: String
    },
    city: {
        type: String
    },
    zip: {
        type: String
    },
    cv: {
        link: { type: String },
        isVerified: { type: Boolean, default: false }
    },
    signedAggrement: {
        link: { type: String },
        isVerified: { type: Boolean, default: false }
    },
    experience: {
        type: Number
    },
    typeOfCoaching: {
        type: String
    },
    skills: {
        type: String
    },
    dateofBirth: {
        type: Date
    },
    placeofBirth: {
        type: String
    },
    profession: {
        type: String,
        required: false,
        trim: true
    },
    bio: {
        type: String,
        required: false
    },
    bankDetails: {
        accountNumber: { type: String },
        code: {
            name: { type: String },
            value: { type: String }
        },
        bankName: {
            type: String
        }
    },
    categories: {
        type: String,
        required: false
    },
    coachingDescription: {
        type: String,
        trim: false
    },
    address: {
        type: String
    },
    ratesPerHour: {
        charges: { type: Number, required: false },
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
        dates: [{
            dayOfWeek: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            },
            isAvailable: { type: Boolean, default: false },
            slots: [{
                startTime: {
                    type: String
                },
                endTime: {
                    type: String
                },
            }],
        }],
        timeZone: { type: String },
        dateOverrides: [{
            date: { type: Date },
            slots: [{
                startTime: {
                    type: String
                },
                endTime: {
                    type: String
                }
            }]
        }]
    },
    bookings: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Booking",
        default: []
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        required: false
    },
    rejectionStep: {
        type: String,

    },
    formFilled: {
        type: Boolean,
        default: false
    }
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
        phone: this.phone,
        profileImage: this.profileImage,
        profileVideo: this.profileVideo,
        address: this.address,
        country: this.country,  
        city: this.city,
        zip: this.zip,
        cv: this.cv,
        signedAggrement: this.signedAggrement,
        experience: this.experience,
        typeOfCoaching: this.typeOfCoaching,
        skills: this.skills,
        dateofBirth: this.dateofBirth,
        placeofBirth: this.placeofBirth,
        profession: this.profession,
        bio: this.bio,
        bankDetails: this.bankDetails,
        categories: this.categories,
        coachingDescription: this.coachingDescription,
        address: this.address,
        ratesPerHour: this.ratesPerHour,
        ratings: this.ratings,
        courses: this?.courses,
        socialLinks: this.socialLinks,
        description: this.description,
        availability: this.availability,
        isApproved: this.isApproved,
        approvalStatus: this.approvalStatus,
        formFilled: this.formFilled
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
