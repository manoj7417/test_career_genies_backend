const { CoachEdit } = require("../models/CoachEditModel")
const { Coach } = require("../models/CoachModel")

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
        coach.profileVideo.isApproved = true;
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
    const { coachId } = req.params;
    try {
        const coachEdit = await CoachEdit.findByIdAndUpdate(coachId, { isRequestApproved: true }, { new: true });
        if (!coachEdit) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Edit coach not found"
            });
        }
        const coach = await Coach.findByIdAndUpdate(
            coachId,
            { ...coachEdit.toObject(), isEditRequestSent: false },
            { new: true }
        );
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }

        res.status(200).send({
            status: "SUCCESS",
            coachEdit
        });
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({ status: "FAILURE", message: "An error occurred while approving edit coach details" })
    }
}


module.exports = {
    verifyCoach,
    auth,
    rejectCoach,
    GeteditCoachRequests,
    approveEditCoach
}