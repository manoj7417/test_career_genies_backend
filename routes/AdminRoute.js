const { verifyCoach, auth, rejectCoach, GeteditCoachRequests } = require("../controllers/AdminController");

async function AdminRoute(fastify, options) {


    fastify.addHook('preHandler', fastify.verifyJWT);

    fastify.patch("/verifyCoach/:coachId", { preHandler: fastify.roleCheck(['admin']) }, verifyCoach)

    fastify.get("/auth", { preHandler: fastify.roleCheck(['admin']) }, auth)

    fastify.patch("/reject/:coachId", { preHandler: fastify.roleCheck(['admin']) }, rejectCoach)

    fastify.get("/getEditCoachRequests" , {
        preHandler: fastify.roleCheck(['admin'])
    } , GeteditCoachRequests)

}

module.exports = AdminRoute;