const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Define the schema for the Coach
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
        type: String,
        required: true
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
        type: String
    },
    formFilled: {
        type: Boolean,
        default: false
    },
    isEditRequestSent: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    timestamps: true
});

// Virtual field for programs
coachSchema.virtual('programs', {
    ref: 'Program',  // The Program model to reference
    localField: '_id',  // The field in Coach schema
    foreignField: 'coachId',  // The field in Program schema that refers to the coach
    justOne: false  // Since a coach can have multiple programs
});

coachSchema.set('toObject', { virtuals: true });
coachSchema.set('toJSON', { virtuals: true });

// Pre-save hook to hash the password
coachSchema.pre("save", async function (next) {
    try {
        if (this.isModified('password') || this.isNew) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password during login
coachSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Method to generate an access token
coachSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// Method to generate a refresh token
coachSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

coachSchema.methods.toSafeObject = function () {
    const coachObject = this.toObject({ virtuals: true });  
    return {
        name: coachObject.name,
        email: coachObject.email,
        phone: coachObject.phone,
        profileImage: coachObject.profileImage,
        profileVideo: coachObject.profileVideo,
        address: coachObject.address,
        country: coachObject.country,
        city: coachObject.city,
        zip: coachObject.zip,
        cv: coachObject.cv,
        signedAggrement: coachObject.signedAggrement,
        experience: coachObject.experience,
        typeOfCoaching: coachObject.typeOfCoaching,
        skills: coachObject.skills,
        dateofBirth: coachObject.dateofBirth,
        placeofBirth: coachObject.placeofBirth,
        profession: coachObject.profession,
        bio: coachObject.bio,
        bankDetails: coachObject.bankDetails,
        categories: coachObject.categories,
        coachingDescription: coachObject.coachingDescription,
        ratesPerHour: coachObject.ratesPerHour,
        ratings: coachObject.ratings,
        courses: coachObject.courses,
        socialLinks: coachObject.socialLinks,
        description: coachObject.description,
        availability: coachObject.availability,
        bookings: coachObject.bookings,  // Ensure bookings are included
        programs: coachObject.programs,  // Add programs to the output
        isApproved: coachObject.isApproved,
        approvalStatus: coachObject.approvalStatus,
        formFilled: coachObject.formFilled,
        isEditRequestSent: coachObject.isEditRequestSent,
        students : coachObject.students
    };
};

// Method to generate a reset password token
coachSchema.methods.generateResetPasswordToken = function () {
    return jwt.sign(
        {
            userId: this._id
        },
        process.env.RESET_PASSWORD_SECRET,
        {
            expiresIn: process.env.RESET_PASSWORD_EXPIRY
        }
    );
};

// Create the Coach model
const Coach = mongoose.model("Coach", coachSchema);

module.exports = { Coach };
