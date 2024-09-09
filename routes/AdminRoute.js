const { verfiyCoach } = require("../controllers/AdminController");

async function AdminRoute(fastify, options) {

    fastify.post("/verifyCoach/:coachId", {
        preHandler: [fastify.verifyJWT, fastify.roleCheck(['admin'])]
    }
        , verfiyCoach)
}

module.exports = AdminRoute;