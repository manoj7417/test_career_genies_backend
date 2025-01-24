const Recruiter = require('../models/recruiterModel');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/nodemailer");
const VerfiyEmailPath = path.join(__dirname, '..', 'emailTemplates', 'VerifyEmail.html');
const welcomeTemplatePath = path.join(__dirname, '..', 'emailTemplates', 'WelcomeTemplate.html');

const getVerificationToken = (recruiterId) => {
    const token = jwt.sign({ id: recruiterId }, process.env.EMAIL_VERIFICATION_SECRET, {
        expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY
    });
    return token;
};

exports.signup = async (request, reply) => {
    try {
        const { email, name, password, company, position, phone } = request.body;

        // Check if email already exists
        const existingRecruiter = await Recruiter.findOne({ email });
        if (existingRecruiter) {
            return reply.code(409).send({
                status: 'error',
                message: 'An account with this email already exists. Please use a different email or try logging in.'
            });
        }

        // Validate required fields
        if (!email || !name || !password || !company || !position || !phone) {
            return reply.code(400).send({
                status: 'error',
                message: 'Please provide all required fields: name, email, password, company, position, and phone'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return reply.code(400).send({
                status: 'error',
                message: 'Please provide a valid email address'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return reply.code(400).send({
                status: 'error',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate phone number (basic validation)
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phone)) {
            return reply.code(400).send({
                status: 'error',
                message: 'Please provide a valid phone number'
            });
        }

        // Create new recruiter
        const newRecruiter = await Recruiter.create({
            name,
            email,
            password,
            company,
            position,
            phone,
            verified: false
        });

        // Generate verification token
        const verificationToken = getVerificationToken(newRecruiter._id);
        const verificationLink = `https://www.geniescareerhub.com/verify-recruiter?token=${verificationToken}&type=recruiter`;

        try {
            // Send verification email
            const VerifyEmail = fs.readFileSync(VerfiyEmailPath, "utf-8");
            const VerfiyEmailBody = VerifyEmail
                .replace("{username}", name)
                .replace("{verify-link}", verificationLink);

            await sendEmail(
                email,
                "Genies Career Hub: Recruiter Email Verification",
                VerfiyEmailBody
            );

            // Schedule welcome email
            const welcomeTemplate = fs.readFileSync(welcomeTemplatePath, "utf-8");
            const welcomeEmailBody = welcomeTemplate.replace("{fullname}", name);
            setTimeout(async () => {
                try {
                    await sendEmail(email, "Welcome to Genies Career Hub", welcomeEmailBody);
                } catch (emailError) {
                    console.error('Error sending welcome email:', emailError);
                }
            }, 100000);

            return reply.code(201).send({
                status: 'success',
                message: 'Registration successful! Please check your email to verify your account.',
                data: {
                    email: newRecruiter.email,
                    name: newRecruiter.name,
                    company: newRecruiter.company
                }
            });

        } catch (emailError) {
            // If email sending fails, delete the created recruiter
            await Recruiter.findByIdAndDelete(newRecruiter._id);
            
            console.error('Error sending verification email:', emailError);
            return reply.code(500).send({
                status: 'error',
                message: 'Failed to send verification email. Please try again later.'
            });
        }

    } catch (err) {
        // Handle mongoose duplicate key error
        if (err.code === 11000) {
            return reply.code(409).send({
                status: 'error',
                message: 'An account with this email already exists. Please use a different email or try logging in.'
            });
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(error => error.message);
            return reply.code(400).send({
                status: 'error',
                message: 'Validation failed',
                errors: errors
            });
        }

        console.error('Signup error:', err);
        reply.code(500).send({
            status: 'error',
            message: 'An error occurred during registration. Please try again later.'
        });
    }
};

exports.verifyEmail = async (request, reply) => {
    try {
        const { token } = request.body;
        
        if (!token) {
            return reply.code(400).send({
                status: 'error',
                message: 'Token is required'
            });
        }

        const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
        const recruiter = await Recruiter.findByIdAndUpdate(
            decoded.id,
            { verified: true },
            { new: true }
        );

        if (!recruiter) {
            return reply.code(404).send({
                status: 'error',
                message: 'Recruiter not found'
            });
        }

        const accessToken = jwt.sign({ id: recruiter._id }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        });

        return reply.send({
            status: 'success',
            message: 'Email verified successfully',
            token: accessToken
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.login = async (request, reply) => {
    try {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.code(400).send({
                status: 'error',
                message: 'Please provide email and password'
            });
        }

        const recruiter = await Recruiter.findOne({ email }).select('+password');

        if (!recruiter || !(await recruiter.correctPassword(password, recruiter.password))) {
            return reply.code(401).send({
                status: 'error',
                message: 'Incorrect email or password'
            });
        }

        // Check if email is verified
        if (!recruiter.verified) {
            return reply.code(401).send({
                status: 'error',
                message: 'Please verify your email before logging in'
            });
        }

        const token = jwt.sign({ id: recruiter._id }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        });

        return reply.send({
            status: 'success',
            token
        });
    } catch (err) {
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.resendVerificationEmail = async (request, reply) => {
    try {
        const { email } = request.body;
        const recruiter = await Recruiter.findOne({ email });

        if (!recruiter) {
            return reply.code(404).send({
                status: 'error',
                message: 'Recruiter not found'
            });
        }

        if (recruiter.verified) {
            return reply.code(400).send({
                status: 'error',
                message: 'Email is already verified'
            });
        }

        const verificationToken = getVerificationToken(recruiter._id);
        const verificationLink = `https://geniescareerhub.com/verify-email?token=${verificationToken}&type=recruiter`;

        const VerifyEmail = fs.readFileSync(VerfiyEmailPath, "utf-8");
        const VerfiyEmailBody = VerifyEmail
            .replace("{username}", recruiter.name)
            .replace("{verify-link}", verificationLink);

        await sendEmail(
            recruiter.email,
            "Genies Career Hub: Recruiter Email Verification",
            VerfiyEmailBody
        );

        return reply.send({
            status: 'success',
            message: 'Verification email sent successfully'
        });
    } catch (err) {
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.getRecruiterProfile = async (request, reply) => {
    try {
        // Get token from header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({
                status: 'error',
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
    
        // Decode token to get recruiter ID
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
       
        const recruiter = await Recruiter.findById(decoded.id);

        if (!recruiter) {
            return reply.code(404).send({
                status: 'error',
                message: 'Recruiter not found'
            });
        }

        // Remove sensitive information
        recruiter.password = undefined;

        return reply.send({
            status: 'success',
            data: {
                recruiter
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({
                status: 'error',
                message: 'Invalid token'
            });
        }
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

// Optional: Get all recruiters (admin only)
exports.getAllRecruiters = async (request, reply) => {
    try {
        const recruiters = await Recruiter.find().select('-password');

        return reply.send({
            status: 'success',
            results: recruiters.length,
            data: {
                recruiters
            }
        });
    } catch (err) {
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
}; 