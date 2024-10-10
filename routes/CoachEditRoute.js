const { editCoachDetails } = require("../controllers/CoachEditController");

async function CoachEditRoute(fastify, options) {
    fastify.post('/details', { preHandler: fastify.coachAuth }, editCoachDetails)

}

module.exports = CoachEditRoute;