const { printResume } = require("../controllers/PrintResumeController")

async function PrintResume(fastify, options) {
    fastify.post("/resume", { preHandler: fastify.verifyJWT }, printResume)
}

module.exports = PrintResume