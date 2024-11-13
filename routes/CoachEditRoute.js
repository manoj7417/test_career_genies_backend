const { editCoachDetails, getCoachEditReqById } = require("../controllers/CoachEditController");

async function CoachEditRoute(fastify, options) {
    fastify.post('/details', { preHandler: fastify.coachAuth }, editCoachDetails)

    fastify.get('/getdetails/:id', { preHandler: fastify.coachAuth }, getCoachEditReqById)
}

module.exports = CoachEditRoute;