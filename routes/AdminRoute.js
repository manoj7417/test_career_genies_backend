const { verifyCoach, auth } = require("../controllers/AdminController");

async function AdminRoute(fastify, options) {


    fastify.addHook('preHandler', fastify.verifyJWT);

    fastify.post("/verifyCoach/:coachId", verifyCoach)

    fastify.get("/auth" , { preHandler: fastify.roleCheck(['admin']) }, auth)
}

module.exports = AdminRoute;