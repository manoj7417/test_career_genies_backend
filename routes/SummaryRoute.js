const { getUserSummary } = require("../controllers/SummaryController");

async function SummaryRoute(fastify, options) {
    fastify.get('/get/all', {
        preHandler: [fastify.verifyJWT]
    }, getUserSummary)
}

module.exports = SummaryRoute;