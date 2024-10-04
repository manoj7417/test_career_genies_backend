const { Analysis } = require("../models/AnalysisModel");
const mongoose = require('mongoose');

const getAnalysisScore = async (req, reply) => {
    const { id } = req.params;
    const userId = req.user._id
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Invalid ID format"
            });
        }

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
        console.log(error)
        reply.status(500).send(error);
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