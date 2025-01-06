const { Coach } = require("../models/CoachModel");
const fs = require('fs')
const path = require("path");
const resetPasswordTemplatePath = path.join(
    __dirname,
    "..",
    "emailTemplates",
    "resetPassword.html"
);
const coachwelcomeEmail = path.join(__dirname, '..', 'emailTemplates', 'coachwelcomeEmail.html');
const { sendEmail } = require("../utils/nodemailer");
const jwt = require("jsonwebtoken");
const { Booking } = require("../models/BookingModel");
const { Program } = require("../models/ProgramModel");
const { default: mongoose } = require("mongoose");
const { CoachPayment } = require("../models/CoachPaymentModel");
require('dotenv').config();
const { OAuth2Client } = require("google-auth-library");
const { google } = require('googleapis');
const { default: axios } = require("axios");
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function decodeToken(token, secret) {
    try {
        const decoded = await jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        throw new Error(error?.message);
    }
}

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const coach = await Coach.findById(userId);
        const accessToken = coach.generateAccessToken();
        const refreshToken = coach.generateRefreshToken();
        coach.refreshToken = refreshToken;
        await coach.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error(
            500,
            "Something went wrong while generating referesh and access token"
        );
    }
};

const registerCoach = async (req, res) => {
    const { name,
        password,
        email,
        phone
    } = req.body;
    try {
        const findExistingUser = await Coach.findOne({ email })
        if (findExistingUser) {
            return res.status(400).send({
                message: "Email ID already exists, try Signing In"
            })
        }
        const coach = new Coach({
            name,
            password,
            email,
            phone
        })
        await coach.save();
        const getStartedEmail = fs.readFileSync(coachwelcomeEmail, "utf-8");
        await sendEmail(
            email,
            "Welcome email",
            getStartedEmail,
        );
        res.status(201).send({
            message: "Coach registered successfully"
        })
    } catch (error) {
        res.status(500).send({
            message: "Failed to register coach"
        })
    }
}

const coachLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const coach = await Coach.findOne({ email });
        if (!coach) {
            return res.code(404).send({
                status: "FAILURE",
                error: "Email does not exist",
            })
        }
        const isPasswordCorrect = await coach.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.code(401).send({
                status: "FAILURE",
                error: "Invalid credentials",
            });
        }
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(coach._id);
        res.code(200).send({
            status: "SUCCESS",
            message: "Login successful",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                userdata: coach.toSafeObject()
            }
        });
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message: "Failed to login coach"
        })
    }
}

const authVerification = async (req, res) => {
    const { accessToken, refreshToken } = req.body;
    try {
        const decoded = await verifyAccessToken(accessToken);
        if (decoded) {
            const newTokens = await generateAccessAndRefereshTokens(decoded._id);
            const user = await Coach.findById({ _id: decoded._id })
            return res.status(200).send({
                status: "SUCCESS",
                message: "Token verified successfully",
                data: {
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken,
                    userdata: user.toSafeObject()
                }
            });
        } else {
            const decodedRefreshToken = await verifyRefreshToken(refreshToken);
            if (decodedRefreshToken) {
                const tokens = await generateAccessAndRefereshTokens(decodedRefreshToken._id);
                const user = await Coach.findById({ _id: decodedRefreshToken._id })
                return res.status(200).send({
                    status: "SUCCESS",
                    message: "Token refreshed successfully",
                    data: {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        userdata: user.toSafeObject()
                    }
                });
            } else {
                return res.status(401).send({ status: "FAILURE", message: "Invalid token" });
            }
        }
    } catch (error) {
        console.log("Error verifying token", error);
        return res.status(500).send({ status: "FAILURE", message: "An error occurred while verifying token" });
    }
};

const verifyAccessToken = async (accessToken) => {
    try {
        return await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        if (error.message === 'jwt expired') {
            return null;
        } else {
            throw error;
        }
    }
};

const verifyRefreshToken = async (refreshToken) => {
    try {
        return await jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw error;
    }
};

const uploadCoachDocuments = async (req, res) => {
    try {

    } catch (error) {

    }
}

const getAllCoaches = async (req, res) => {
    try {
        const coaches = await Coach.find().populate('bookings').populate('programs');
        res.status(200).send({
            status: "SUCCESS",
            coaches
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}

const getCoachDetails = async (req, res) => {
    const { coachId } = req.params;

    try {
        const coach = await Coach.findById(coachId)
            .populate('bookings')
            .populate('programs');

        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }

        res.status(200).send({
            status: "SUCCESS",
            coach: coach.toSafeObject()  // Ensure toSafeObject includes virtual fields
        });
    } catch (error) {
        console.error("Error", error);
        res.status(500).send({ status: "FAILURE", error });
    }
};


const updateCoachDetails = async (req, res) => {
    const coachId = req.coach._id;
    try {
        const coach = await Coach.findByIdAndUpdate(coachId, req.body, { new: true });
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }
        res.status(200).send({
            status: "SUCCESS",
            coach: coach.toSafeObject()
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: "An error occurred while updating coach details"
        });
    }
}

const setCoachAvailability = async (req, res) => {
    const coachId = req.coach._id;
    const { dates, timeZone, dateOverrides } = req.body;
    try {
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach does not exist"
            });
        }
        coach.availability = {
            dates,
            timeZone,
            dateOverrides
        }
        await coach.save();
        res.status(200).send({
            message: "Coach availability updated successfully",
            data: coach.toSafeObject()
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: "An error occurred while updating coach availability"
        });
    }
}

const forgotCoachPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const coach = await Coach.findOne({ email })
        if (!coach) {
            return reply.code(404).send({
                status: "FAILURE",
                message: "Coach not found",
            });
        }
        const token = await coach.generateResetPasswordToken();
        const url = `https://geniescareerhub.com/reset-password?token=${token}&type=coach`;
        const emailtemplate = fs.readFileSync(resetPasswordTemplatePath, "utf-8");
        const emailBody = emailtemplate
            .replace("{userName}", coach.name)
            .replace("{reset-password-link}", url);
        await sendEmail(coach.email, "Reset Password", emailBody);
        res.code(200).send({
            status: "SUCCESS",
            message: "Reset password link has been sent to your email",
        });
    } catch (error) {
        console.log(error);
        res.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error",
        });
    }
}

const resetCoachPassword = async (req, res) => {
    const { newPassword, token } = req.body;
    try {
        if (!token) {
            return res.code(404).send({ status: "FAILURE", message: "Token is missing" });
        }
        const { userId } = await decodeToken(token, process.env.RESET_PASSWORD_SECRET);
        const coach = await Coach.findOne({ _id: userId });
        if (!coach) {
            return res.code(404).send({ status: "FAILURE", message: "Invalid token" });
        }
        coach.password = newPassword;
        await coach.save();
        return res.code(200).send({ status: "SUCCESS", message: "Password reset successfully" });
    } catch (error) {
        return res.code(500).send({ status: "FAILURE", message: "An error occurred while resetting password" });
    }
}

const getBookings = async (req, res) => {
    const coach = req.coach;
    try {
        const bookings = await Booking.find({ coachId: coach._id }).populate('userId', 'fullname email phoneNumber profilePicture');

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            refresh_token: coach?.googleAuth?.refreshToken
        });


        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });


        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.status(200).send({
            status: "SUCCESS",
            bookings,
            googleEvents: events.data.items,
        });
    } catch (error) {
        console.error("Error fetching bookings or calendar events:", error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching bookings or calendar events" });
    }
};

const createProgram = async (req, res) => {
    try {
        const coachId = req.coach._id;
        const { title, description, prerequisites, content, programImage, programVideo, amount } = req.body;
        // if (!programImage) {
        //     return res.status(400).send({ status: "FAILURE", message: "Program image is required" });
        // }
        const rates = await axios.get(`https://apilayer.net/api/live?access_key=${process.env.APILAYER_API_KEY}&currencies=INR,USD&source=GBP&format=1`)
        const INRrate = Math.round(rates?.data?.quotes?.GBPINR);
        const USDrate = Math.round(rates?.data?.quotes?.GBPUSD);
        const program = new Program({
            coachId,
            title,
            description,
            prerequisites,
            content,
            programImage,
            programVideo,
            amount,
            currency: "GBP",
            INRrate: INRrate * amount,
            USDrate: USDrate * amount,
        });

        await program.save();
        res.status(201).send({ status: "SUCCESS", message: "Program created successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while creating the program" });
    }
};

const getAllPrograms = async (req, res) => {
    try {
        const programs = await Program.find().populate(
            'coachId',
        );
        res.status(200).send({ status: "SUCCESS", programs });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching programs" });
    }
}

const getCoachPrograms = async (req, res) => {
    const coachId = req.coach._id;
    try {
        const programs = await Program.find({ coachId, isapproved: true });
        console.log(programs)
        res.status(200).send({ status: "SUCCESS", programs });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching programs" });
    }
}

const getAllCoachPrograms = async (req, res) => {
    const coachId = req.coach._id;
    try {
        const programs = await Program.find({ coachId });
        res.status(200).send({ status: "SUCCESS", programs });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching programs" });
    }
}

const getCoachProgramById = async (req, res) => {
    const { coachId } = req.params;
    try {
        const programs = await Program.find({ coachId });
        res.status(200).send({ status: "SUCCESS", programs });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching programs" });
    }
}

const getCoachProgramByprogramId = async (req, res) => {
    const { programId } = req.params;
    const coachId = req.coach._id;
    try {
        const program = await Program.findOne({ _id: programId, coachId })
        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found"
            });
        }
        res.status(200).send({ status: "SUCCESS", program });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching program" });
    }
}

const updateProgram = async (req, res) => {
    const { programId } = req.params;
    const coachId = req.coach._id;
    const { title, description, prerequisites, content, programImage, programVideo, amount } = req.body;
    try {
        if (!mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).send({
                status: "FAILURE",
                message: "Invalid program ID"
            });
        }
        const program = await Program.findOneAndUpdate(
            { _id: programId, coachId },
            {
                ...(title && { title }),
                ...(description && { description }),
                ...(prerequisites && { prerequisites }),
                ...(content && { content }),
                ...(programImage && { programImage }),
                ...(programVideo && { programVideo }),
                ...(amount && { amount }),
            },
            { new: true } 
        );
        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found or unauthorized"
            });
        }
        return res.status(200).send({
            status: "SUCCESS",
            message: "Program updated successfully",
            program 
        });
    } catch (error) {
        console.error("Error updating program:", error);
        return res.status(500).send({
            status: "FAILURE",
            message: error.message || "An error occurred while updating the program"
        });
    }
};


const deleteProgram = async (req, res) => {
    const coachId = req.coach._id;
    const { programId } = req.params;
    try {

        const program = await Program.findOneAndDelete({ _id: programId, coachId });

        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found or unauthorized"
            });
        }
        return res.status(204).send({
            status: "SUCCESS",
            message: "Program deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while deleting the program"
        });
    }
};

const editProgramByadmin = async (req, res) => {
    const { _id, title, description, prerequisites, days, isapproved } = req.body; // Destructure fields from the request body

    try {
        // Validate that _id is a valid ObjectId
        if (!mongoose.isValidObjectId(_id)) {
            return res.status(400).send({
                status: "FAILURE",
                message: "Invalid program ID",
            });
        }

        // Perform the update using findByIdAndUpdate
        const updatedProgram = await Program.findByIdAndUpdate(
            _id,
            {
                ...(title && { title }),              // Update title if provided
                ...(description && { description }),  // Update description if provided
                ...(prerequisites && { prerequisites }),  // Update prerequisites if provided
                ...(days && { days }),  // Update days if provided
                ...(typeof isapproved !== "undefined" && { isapproved })  // Update isapproved if explicitly provided
            },
            { new: true, lean: true }  // Return the updated document in plain JavaScript object format
        );

        // If the program is not found
        if (!updatedProgram) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found",
            });
        }

        // Successfully updated, return the updated program
        return res.status(200).send({
            status: "SUCCESS",
            message: "Program updated successfully",
            program: updatedProgram,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while updating the program",
        });
    }
};

const getCompletedProgramBookings = async (req, res) => {
    const coachId = req.coach._id;
    try {
        const bookings = await CoachPayment.find({ coachId: coachId, status: "Completed" }).populate("programId", 'title description programImage amount').populate("user", 'fullname email profilePicture');
        return res.status(200).send({
            status: "SUCCESS",
            message: "Completed program bookings fetched successfully",
            bookings
        });
    } catch (error) {
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while fetching running programs"
        });
    }
}
const CoachgoogleLogin = async (req, reply) => {
    const { idToken, accessToken, refreshToken } = req.body; // Include tokens from request
    try {
        // Verify the Google ID token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Check if the user exists
        let user = await Coach.findOne({ email });
        if (!user) {
            user = new Coach({
                name: name,
                email,
                profileImage: picture,
                googleAuth: {
                    googleId: payload.sub, // Google's unique user ID
                    isAuthorized: true,
                    accessToken: accessToken, // Save Google access token
                    refreshToken: refreshToken, // Save Google refresh token
                    tokenExpiry: new Date(payload.exp * 1000), // Convert expiry time to Date
                },
            });
        } else {
            // Update existing user's Google access and refresh tokens
            user.googleAuth = {
                googleId: payload.sub,
                isAuthorized: true,
                accessToken: accessToken,
                refreshToken: refreshToken,
                tokenExpiry: new Date(payload.exp * 1000),
            };
        }

        await user.save();

        // Generate tokens
        const generatedTokens = {
            accessToken: user.generateAccessToken(),
            refreshToken: user.generateRefreshToken(),
        };

        reply.code(200).send({
            status: "SUCCESS",
            message: "Login successful",
            data: {
                accessToken: generatedTokens.accessToken,
                refreshToken: generatedTokens.refreshToken,
                userdata: user.toSafeObject(),
            },
        });
    } catch (error) {
        console.error("Error during Google Login:", error);
        reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error",
        });
    }
};


const syncCalendar = async (req, res) => {
    const { idToken, accessToken, refreshToken } = req.body;
    const coachId = req.coach._id;
    try {
        const coach = await Coach.findById(coachId)
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }
        coach.googleAuth.accessToken = accessToken
        coach.googleAuth.refreshToken = refreshToken
        await coach.save()
        const oauth2Client = new google.auth.OAuth2();
        const ticket = await oauth2Client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userId = payload.sub;
        const email = payload.email;

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });

        // const bookings = await Booking.find({ coachId })
        res.status(200).send({
            userId,
            email,
            events: events.data.items,
        });
    } catch (error) {
        console.error('Error syncing calendar:', error.message);
        res.status(500).send({ error: 'Failed to sync calendar events' });
    }
}




module.exports = {
    registerCoach,
    coachLogin,
    getAllCoaches,
    updateCoachDetails,
    getCoachDetails,
    setCoachAvailability,
    forgotCoachPassword,
    resetCoachPassword,
    uploadCoachDocuments,
    authVerification,
    getBookings,
    createProgram,
    getAllPrograms,
    getCoachPrograms,
    updateProgram,
    deleteProgram,
    getCoachProgramById,
    editProgramByadmin,
    getCoachProgramByprogramId,
    getAllCoachPrograms,
    getCompletedProgramBookings,
    CoachgoogleLogin,
    syncCalendar
}