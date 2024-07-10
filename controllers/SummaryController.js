const { Summary } = require("../models/SummaryModel");

const getUserSummary = async (req, reply) => {
    const userId = req.user._id;
    try {
        const userSummary = await Summary.find({ userId })
        if (userSummary.length === 0) {
            return reply.status(404).send({
                status: "FAILURE",
                error: "User summary not found"
            })
        }
        return reply.status(200).send({
            status: "SUCCESS",
            data: userSummary
        })
    } catch (error) {
        console.log(error)
        reply.status(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}

module.exports = { getUserSummary }