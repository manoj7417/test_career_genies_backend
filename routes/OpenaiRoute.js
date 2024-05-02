const { createAssistant, createThread, communicateWithAgent, aiAgent, atsCheck, askBot, analyseResume } = require("../utils/openai");
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
    fastify.post("/aiAgent",{ preHandler: [ upload.single('file')] }, aiAgent)
    fastify.post("/atsCheck", atsCheck)
    fastify.post("/askBot", askBot)
    fastify.post("/createThread", { schema: createAssistantSchema }, createThread)
}

module.exports = OpenaiRoute;
