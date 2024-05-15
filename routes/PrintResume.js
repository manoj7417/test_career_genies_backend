const { printResume } = require("../controllers/PrintResumeController")

async function PrintResume(fastify, options) {
    fastify.post("/resume", printResume)
}

module.exports = PrintResume