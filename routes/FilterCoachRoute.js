const { addFilterCoach } = require("../controllers/FilterCoachController");

async function FilterCoachRoute(fastify, options) {
    fastify.post('/add', addFilterCoach)
}

module.exports = FilterCoachRoute;