const { Resume } = require("../models/ResumeModel");
const { User } = require("../models/userModel")

// get the user resume based on the resumeId
const getUserResume = async (request, reply) => {
    const userId = request.user._id
    const { resumeId } = request.params;
    try {
        const userResume = await Resume.find({ _id: resumeId, userId })
        if (!userResume) {
            reply.code(404).send({
                status: "FAILURE",
                error: "User Resume not found"
            })
        }
        reply.code(200).send({
            status: "SUCCESS",
            message: "User resume data",
            data: userResume
        })
    } catch (error) {
        console.log(error)
        reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}

//get all resumes of the user 
const getAllResumes = async (request, reply) => {
    const userId = request.user._id;
    const { status } = request.query;
    const validStatus = ['inProgress', 'completed', 'downloaded'];

    if (status && !validStatus.includes(status)) {
        return reply.code(400).send({
            status: "FAILURE",
            error: "Invalid status value"
        });
    }
    try {
        let query = { userId };
        if (status) {
            query.status = status;
        }
        const resumes = await Resume.find(query)
        if (resumes.length === 0) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "No user resumes found"
            })
        }

        reply.code(200).send({
            status: "SUCCESS",
            message: "User resumes data",
            data: resumes
        })
    } catch (error) {
        console.log(error)
        reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}


// udpate the resume fields of the user based on the resumeId 
const updateUserResume = async () => {
    const { resumeId } = req.params;
    const updates = req.body;
    try {
        const resume = await Resume.findById(resumeId)
        if (!resume) {
            return reply.code(404).send({ status: "FAILURE", error: 'Resume not found' });
        }

        for (let key in updates) {
            if (key !== '_id') {
                resume[key] = updates[key];
            }
        }

        await resume.save()
        return reply.code(200).send({
            status: "SUCCESS",
            message: "Resume udpated successfully", data: resume
        })
    } catch (error) {
        console.log(error)
        return reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}
// create a new resume for the user
const createResume = async (request, reply) => {
    const userId = request.user._id;
    try {
        return reply.code(201).send({
            status: "SUCCESS",
            message: "Resume created succesfully",
        })
    } catch (error) {
        console.log(error)
        return reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}


// delete the resume of the user based on the resumeId
const deleteResume = async (request, reply) => {
    const { resumeId } = request.params;
    const userId = request.user._id;
    try {
        const userResume = await Resume.findOne({ _id: resumeId, userId })
        if (!userResume) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User Resume not found"
            })
        }
        await Resume.findByIdAndDelete(resumeId)
        return reply.code(204).send({
            status: "SUCCESS",
            message: "User resume deleted"
        })
    } catch (error) {
        console.log(error)
        return reply.code(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}




module.exports = { getUserResume, updateUserResume, createResume, deleteResume, getAllResumes    }