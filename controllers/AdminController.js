const { CoachEdit } = require("../models/CoachEditModel")
const { Coach } = require("../models/CoachModel")
const path = require('path')
const fs = require('fs');
const { sendEmail } = require("../utils/nodemailer");
const approveCoachTemplate = path.join(__dirname, '..', 'emailTemplates', 'coachApprovalTemplate.html');


const verifyCoach = async (req, res) => {
    const { coachId } = req.params
    try {
        const coach = await Coach.findById(coachId)
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            })
        }
        coach.cv.isVerified = true;
        coach.signedAggrement.isVerified = true;
        coach.isApproved = true;
        coach.approvalStatus = 'approved'
        coach.profileVideo.url && (coach.profileVideo.isApproved = true);
        await coach.save()
        const template = fs.readFileSync(approveCoachTemplate, 'utf8')
        await sendEmail(coach.email, 'Your account has been verified', template)
        res.status(200).send({
            status: "SUCCESS",
            message: "Coach found",
            coach
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}

const rejectCoach = async (req, res) => {
    const { coachId } = req.params
    const { reason } = req.body
    try {
        const coach = await Coach.findById(coachId)
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            })
        }
        coach.approvalStatus = 'rejected'
        coach.rejectionReason = reason
        coach.isApproved = false

        await coach.save()
        res.status(200).send({
            status: "SUCCESS",
            message: "Coach found",
            coach
        })
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", error })
    }
}

const auth = async (req, res) => {
    const user = req.user
    try {
        const userInfo = user.toSafeObject()
        res.status(200).send({ data: userInfo })
    } catch (error) {
        console.log("Auth error", error)
        res.status(500).send(error)
    }
}

const GeteditCoachRequests = async (req, res) => {
    try {
        const editCoaches = await CoachEdit.find();
        res.status(200).send({
            status: "SUCCESS",
            editCoaches
        })
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", message: "An error occurred while getting edit coach details" })
    }
}

const approveEditCoach = async (req, res) => {
    const { id } = req.params;
    try {
        const coachEdit = await CoachEdit.findById(id);
        if (!coachEdit) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Edit coach not found"
            });
        }
        const coach = await Coach.findByIdAndUpdate(
            coachEdit.coachId,
            { ...coachEdit.toObject(), isEditRequestSent: false },
            { new: true }
        );
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }
        await CoachEdit.findByIdAndDelete(id)
        res.status(200).send({
            status: "SUCCESS",
            message: "Coach details updated"
        });
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", message: "An error occurred while approving edit coach details" })
    }
}

const getCoachEditReqById = async (req, res) => {
    const { id } = req.params;
    try {
        const editRequest = await CoachEdit.findById(id);
        if (!editRequest) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Edit request not found"
            });
        }
        res.status(200).send({
            status: "SUCCESS",
            editRequest
        });
    } catch (error) {
        console.log("Error", error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while getting edit coach details" });
    }
}

module.exports = {
    verifyCoach,
    auth,
    rejectCoach,
    GeteditCoachRequests,
    approveEditCoach,
    getCoachEditReqById
}