const { getAnalysisScore, getAllAnalysis } = require("../controllers/AnalysisController");


async function AnalysisRoute(fastify, options) {

    fastify.get('/score/:id', { preHandler: fastify.verifyJWT }, getAnalysisScore)

    fastify.get("/all", { preHandler: fastify.verifyJWT }, getAllAnalysis)
}

module.exports = AnalysisRoute;