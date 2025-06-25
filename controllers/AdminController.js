const { CoachEdit } = require("../models/CoachEditModel")
const { Coach } = require("../models/CoachModel")
const path = require('path')
const fs = require('fs');
const { sendEmail } = require("../utils/nodemailer");
const approveCoachTemplate = path.join(__dirname, '..', 'emailTemplates', 'coachApprovalTemplate.html');
const { resetAllExpiredCredits } = require('../utils/creditUtils');
const { User } = require('../models/userModel');


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

        // Convert to object and exclude _id
        const updateData = { ...coachEdit.toObject(), isEditRequestSent: false };
        delete updateData._id;

        const coach = await Coach.findByIdAndUpdate(
            coachEdit.coachId,
            updateData,
            { new: true }
        );

        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }

        await CoachEdit.findByIdAndDelete(id);
        res.status(200).send({
            status: "SUCCESS",
            message: "Coach details updated"
        });
    } catch (error) {
        console.log("Error", error);
        res.status(500).send({ status: "FAILURE", message: "An error occurred while approving edit coach details" });
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

const resetExpiredCredits = async (req, res) => {
    try {
        console.log('Manual reset of expired credits triggered');
        const result = await resetAllExpiredCredits();

        if (result.success) {
            return res.status(200).json({
                status: "SUCCESS",
                message: `Successfully reset expired credits for ${result.updatedUsers} users`,
                updatedUsers: result.updatedUsers
            });
        } else {
            return res.status(500).json({
                status: "FAILURE",
                message: "Failed to reset expired credits",
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in resetExpiredCredits endpoint:', error);
        return res.status(500).json({
            status: "FAILURE",
            message: "Internal server error",
            error: error.message
        });
    }
};

const removeDuplicatePlans = async (req, res) => {
    try {
        console.log('Manual removal of duplicate plans triggered');

        // Find all users with subscription plans
        const users = await User.find({ 'subscription.plan': { $exists: true, $ne: [] } });
        let updatedUsersCount = 0;

        for (const user of users) {
            const originalPlans = user.subscription.plan || [];
            const uniquePlans = [...new Set(originalPlans)];

            // Only update if there were duplicates
            if (originalPlans.length !== uniquePlans.length) {
                user.subscription.plan = uniquePlans;
                await user.save();
                updatedUsersCount++;
                console.log(`Removed duplicate plans for user ${user._id}: [${originalPlans.join(', ')}] -> [${uniquePlans.join(', ')}]`);
            }
        }

        return res.status(200).json({
            status: "SUCCESS",
            message: `Successfully removed duplicate plans for ${updatedUsersCount} users`,
            updatedUsersCount: updatedUsersCount,
            totalUsersChecked: users.length
        });

    } catch (error) {
        console.error('Error removing duplicate plans:', error);
        return res.status(500).json({
            status: "FAILURE",
            message: "Failed to remove duplicate plans",
            error: error.message
        });
    }
};

const removeOldTrialFields = async (req, res) => {
    try {
        console.log('Manual removal of old trial fields triggered');

        // Find all users with the old trial field
        const users = await User.find({ 'trial': { $exists: true } });
        let updatedUsersCount = 0;

        for (const user of users) {
            // Remove the old trial field
            user.trial = undefined;
            await user.save();
            updatedUsersCount++;
            console.log(`Removed old trial field for user ${user._id}`);
        }

        return res.status(200).json({
            status: "SUCCESS",
            message: `Successfully removed old trial fields for ${updatedUsersCount} users`,
            updatedUsersCount: updatedUsersCount,
            totalUsersChecked: users.length
        });

    } catch (error) {
        console.error('Error removing old trial fields:', error);
        return res.status(500).json({
            status: "FAILURE",
            message: "Failed to remove old trial fields",
            error: error.message
        });
    }
};

module.exports = {
    verifyCoach,
    auth,
    rejectCoach,
    GeteditCoachRequests,
    approveEditCoach,
    getCoachEditReqById,
    resetExpiredCredits,
    removeDuplicatePlans,
    removeOldTrialFields
}