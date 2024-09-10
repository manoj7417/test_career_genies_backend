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
        phoneNumber
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
            phoneNumber
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
        const isPasswordCorrect = await coach.comparePassword(password);
        if (!isPasswordCorrect) {
            return reply.code(401).send({
                status: "FAILURE",
                error: "Invalid password",
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

const uploadCoachDocuments = async (req, res) => {
    try {
        
    } catch (error) {
        
    }
}

const getAllCoaches = async (req, res) => {
    try {
        const coaches = await Coach.find()
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
    const { coachId } = req.params
    try {
        const coach = await Coach.findById(coachId)
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            })
        }
        res.status(200).send({
            status: "SUCCESS",
            coach: coach.toSafeObject()
        })
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", error })
    }
}

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
    const { dayOfWeek, slots, isRecurring, unavailableDates } = req.body;
    try {
        const coach = await Coach.findById(coachId);
        coach.availability = {
            dayOfWeek,
            slots,
            isRecurring,
            unavailableDates
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
        res.code(201).send({
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
        const coach = await Coach.findOne({ resetPasswordToken: token });
        if (!coach) {
            return res.code(404).send({ status: "FAILURE", message: "Token not found" });
        }
        coach.password = newPassword;
        await coach.save();
        return res.code(200).send({ status: "SUCCESS", message: "Password reset successfully" });
    } catch (error) {

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
    uploadCoachDocuments
}