const { Analysis } = require("../models/AnalysisModel");

const getAnalysisScore = async (req, reply) => {
    const { id } = req.params;
    const userId = req.user._id
    try {
        const analysisScore = await Analysis.findOne({ _id: id, userId });
        if (!analysisScore) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "Analysis Score not found"
            });
        }
        reply.code(200).send({
            status: "SUCCESS",
            data: analysisScore
        });

    } catch (error) {
        console.log("Error getting user analysis score")
    }
}

const getAllAnalysis = async (req, reply) => {
    try {
        const userId = req.user._id;
        const analysis = await Analysis.find({ userId });
        reply.code(200).send({
            status: "SUCCESS",
            data: analysis
        });
    } catch (error) {
        console.log("Error getting all analysis")
        reply.status(500).send(error);
    }
}


module.exports = {
    getAnalysisScore,
    getAllAnalysis
}