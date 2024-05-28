const { getUserResume, updateUserResume, createResume, deleteResume, getAllResumes } = require("../controllers/ResumeController");

const updateResumeSchema = {
    params: {
        type: 'object',
        properties: {
            resumeId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            personalInfo: { type: 'object' },
            education: { type: 'array' },
            experience: { type: 'array' },
            skills: { type: 'array' },
            certifications: { type: 'array' },
            projects: { type: 'array' },
            customSections: { type: 'array' },
            status: { type: 'string' }
        }
    }
};

const createResumeSchema = {
    body: {
        type: 'object',
        properties: {
            personalInfo: { type: 'object' },
            education: { type: 'array' },
            experience: { type: 'array' },
            skills: { type: 'array' },
            certifications: { type: 'array' },
            projects: { type: 'array' },
            customSections: { type: 'array' }
        }
    }
};

async function ResumeRoute(fastify, options) {
    // check JWT token and validate it 
    fastify.addHook('preValidation', fastify.verifyJWT)

    // get the user resume based on the resumeId
    fastify.get("/get/:resumeId", getUserResume)


    //get all resumes of the user 
    fastify.get("/allResume", getAllResumes)

    // udpate the resume fields of the user based on the resumeId 
    fastify.patch("/update/:resumeId", { schema: updateResumeSchema }, updateUserResume)

    // create a new resume for the user
    fastify.post("/create", { schema: createResumeSchema }, createResume)

    // delete the resume of the user based on the resumeId
    fastify.delete("/delete/:resumeId", deleteResume)

}

module.exports = ResumeRoute;