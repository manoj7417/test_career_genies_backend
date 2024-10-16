const { Coach } = require("../models/CoachModel");
const fs = require('fs')
const path = require("path");
const resetPasswordTemplatePath = path.join(
    __dirname,
    "..",
    "emailTemplates",
    "resetPassword.html"
);
const { sendEmail } = require("../utils/nodemailer");
const jwt = require("jsonwebtoken");
const { Booking } = require("../models/BookingModel");
const { Program } = require("../models/ProgramModel");
require('dotenv').config();

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
                message: "User with email already exists"
            })
        }
        const coach = new Coach({
            name,
            password,
            email,
            phone
        })
        await coach.save();
        res.status(201).send({
            message: "Coach registered successfully"
        })
    } catch (error) {
        console.log(error)
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
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", error })
    }
}

const getCoachDetails = async (req, res) => {
    const { coachId } = req.params;

    try {
        // Find the coach by ID and populate both bookings and the virtual programs field
        const coach = await Coach.findById(coachId)
            .populate('bookings')  // Populate bookings
            .populate('programs');  // Populate programs via virtual field

        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }

        // Respond with the coach object, including populated programs
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
        // const url = `http://localhost:3000/reset-password?token=${token}&type=coach`;
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
    const coachId = req.coach._id;
    try {
        const bookings = await Booking.find({ coachId }).populate('userId', 'fullname  email phoneNumber profilePicture');
        res.status(200).send({ status: "SUCCESS", bookings });

    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching bookings" });
    }
}

const createProgram = async (req, res) => {
    try {
        const coachId = req.coach._id;
        const { title, description, prerequisites, days, programImage, programVideo } = req.body;

        // Validate required fields
        if (!programImage) {
            return res.status(400).send({ status: "FAILURE", message: "Program image is required" });
        }

        const program = new Program({
            coachId,
            title,
            description,
            prerequisites,
            days,
            programImage,  
            programVideo  
        });

        await program.save();
        res.status(200).send({ status: "SUCCESS", message: "Program created successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while creating the program" });
    }
};

const getAllPrograms = async (req, res) => {
    try {
        const programs = await Program.find();
        res.status(200).send({ status: "SUCCESS", programs });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching programs" });
    }
}

const getCoachPrograms = async (req, res) => {
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

const updateProgram = async (req, res) => {
    const coachId = req.coach._id;  // Extract the coach's ID from the authenticated user
    const { _id, title, description, prerequisites, days } = req.body;  // Destructure fields from the request body

    try {
        // Perform a single database call to find and update the program
        const program = await Program.findOneAndUpdate(
            { _id: _id, coachId: coachId },  // Ensure program exists and belongs to the coach
            {
                ...(title && { title }),              // Update only if the field is provided
                ...(description && { description }),
                ...(prerequisites && { prerequisites }),
                ...(days && { days })
            },
            { new: true, lean: true }  // Return the updated document in a plain JavaScript object format for faster read
        );

        // If the program is not found or doesn't belong to the coach
        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found or unauthorized"
            });
        }

        // Successfully updated, return the updated program
        return res.status(200).send({
            status: "SUCCESS",
            message: "Program updated successfully",
            program
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while updating the program"
        });
    }
};

const deleteProgram = async (req, res) => {
    const coachId = req.coach._id;
    const { _id } = req.body;

    try {

        const program = await Program.findOneAndDelete({ _id: _id, coachId: coachId });
        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found or unauthorized"
            });
        }
        return res.status(200).send({
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
    const { coachId } = req.params;
    const { _id, title, description, prerequisites, days, isapproved } = req.body;  // Destructure fields from the request body

    try {
        // Perform a single database call to find and update the program
        const program = await Program.findOneAndUpdate(
            { _id: _id, coachId: coachId },  // Ensure program exists and belongs to the coach
            {
                ...(title && { title }),              // Update title if provided
                ...(description && { description }),  // Update description if provided
                ...(prerequisites && { prerequisites }),  // Update prerequisites if provided
                ...(days && { days }),  // Update days if provided
                ...(typeof isapproved !== 'undefined' && { isapproved })  // Update isapproved if provided (explicitly checking for undefined)
            },
            { new: true, lean: true }  // Return the updated document in a plain JavaScript object format for faster read
        );

        // If the program is not found or doesn't belong to the coach
        if (!program) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Program not found or unauthorized"
            });
        }

        // Successfully updated, return the updated program
        return res.status(200).send({
            status: "SUCCESS",
            message: "Program updated successfully",
            program
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while updating the program"
        });
    }
};




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
    editProgramByadmin
}