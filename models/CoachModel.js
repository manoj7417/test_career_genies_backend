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
        required: false,
        trim: true
    },
    phone: {
        type: String,
        required: false
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
        name: { type: String, required: false, trim: true, enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'other'], default: 'other' },
        link: { type: String, required: false, trim: true }
    }],
    description: { type: String, required: false, trim: true },
    blogs: [],
    availability: {
        dates: {
            type: [
                {
                    dayOfWeek: {
                        type: String,
                        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                    },
                    isAvailable: { type: Boolean, default: false },
                    slots: {
                        type: [
                            {
                                startTime: { type: String },
                                endTime: { type: String },
                            }
                        ],
                        default: [] 
                    },
                }
            ],
            default: [
                { dayOfWeek: 'Monday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Tuesday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Wednesday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Thursday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Friday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Saturday', isAvailable: false, slots: [] },
                { dayOfWeek: 'Sunday', isAvailable: false, slots: [] },
            ],
        },
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
            }],
            isUnavailable: { type: Boolean, default: false }
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
    },
    googleAuth: {
        googleId: { type: String, trim: true },
        isAuthorized: { type: Boolean, default: false },
        accessToken: { type: String, trim: true },
        refreshToken: { type: String, trim: true },
        tokenExpiry: { type: Date },
    },
}, {
    timestamps: true
});

// Virtual field for programs
coachSchema.virtual('programs', {
    ref: 'Program',
    localField: '_id',  // The field in Coach schema
    foreignField: 'coachId',  // The field in Program schema that refers to the coach
    justOne: false
});

coachSchema.set('toObject', { virtuals: true });
coachSchema.set('toJSON', { virtuals: true });

coachSchema.pre("save", async function (next) {
    try {
        if (this.password && (this.isModified('password') || this.isNew)) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        next();
    } catch (error) {
        next(error);
    }
});

coachSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

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
        bookings: coachObject.bookings,
        programs: coachObject.programs,
        isApproved: coachObject.isApproved,
        approvalStatus: coachObject.approvalStatus,
        formFilled: coachObject.formFilled,
        isEditRequestSent: coachObject.isEditRequestSent,
        students: coachObject.students,
        googleAuth: coachObject.googleAuth
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
    );
};

const Coach = mongoose.model("Coach", coachSchema);

module.exports = { Coach };
