const { createAssistant, createThread, communicateWithAgent, aiAgent, atsCheck, askBot, analyzeResume, generateBetterResume, generateResumeOnFeeback, aicounselling, generateCounsellingTest, generateCareerAdvice, generateFreshResume } = require("../utils/openai");
const multer = require('fastify-multer');
const upload = multer({ dest: 'uploads/' });


const createAssistantSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'instructions', 'model'],
            properties: {
                name: { type: 'string', maxLength: 100 },
                instructions: { type: 'string' },
                model: { type: 'string', maxLength: 100 }
            }
        }
    }
};


async function OpenaiRoute(fastify, options) {
    fastify.post("/createAssistant", { schema: createAssistantSchema }, createAssistant)
    fastify.post("/communicateWithAgent", communicateWithAgent)
    fastify.post("/aiAgent", { preHandler: [upload.single('file')] }, aiAgent)
    fastify.post("/atsCheck", { preHandler: fastify.verifyJWT }, atsCheck)
    fastify.post("/askBot", askBot)
    fastify.post("/analyzeResume", { preHandler: [upload.single('file')] }, analyzeResume)
    // fastify.post("/analyseResume", { preHandler: [fastify.verifyJWT, upload.single('file')] }, analyseResume)
    fastify.post("/createThread", { schema: createAssistantSchema }, createThread)
    fastify.post("/generateBetterResume", generateBetterResume)
    fastify.post("/generateResumeOnFeeback", { preHandler: fastify.verifyJWT }, generateResumeOnFeeback)
    fastify.post('/generateFreshResume', { preHandler: fastify.verifyJWT }, generateFreshResume)
    fastify.post("/generateCounsellingTest", { preHandler: fastify.verifyJWT }, generateCounsellingTest)
    fastify.post("/generateCareerAdvice", { preHandler: fastify.verifyJWT }, generateCareerAdvice)
}

module.exports = OpenaiRoute;
