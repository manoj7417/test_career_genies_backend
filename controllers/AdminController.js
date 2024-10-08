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




module.exports = {
    verifyCoach,
    auth,
    rejectCoach
}