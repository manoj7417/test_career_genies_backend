const { verifyCoach, auth, rejectCoach, GeteditCoachRequests, approveEditCoach, getCoachEditReqById, resetExpiredCredits, removeDuplicatePlans, removeOldTrialFields } = require("../controllers/AdminController");

async function AdminRoute(fastify, options) {


    fastify.addHook('preHandler', fastify.verifyJWT);

    fastify.patch("/verifyCoach/:coachId", { preHandler: fastify.roleCheck(['admin']) }, verifyCoach)

    fastify.get("/auth", { preHandler: fastify.roleCheck(['admin']) }, auth)

    fastify.patch("/reject/:coachId", { preHandler: fastify.roleCheck(['admin']) }, rejectCoach)

    fastify.get("/getEditCoachRequests", {
        preHandler: fastify.roleCheck(['admin'])
    }, GeteditCoachRequests)

    fastify.patch("/approve/editCoachRequest/:id", {
        preHandler: fastify.roleCheck(['admin'])
    }, approveEditCoach)

    fastify.get('/getdetails/:id', {
        preHandler: fastify.roleCheck(['admin'])
    }, getCoachEditReqById)

    // Endpoint to reset all expired credits
    fastify.post('/reset-expired-credits', {
        preHandler: fastify.roleCheck(['admin'])
    }, resetExpiredCredits)

    // Endpoint to remove duplicate plans from user subscriptions
    fastify.post('/remove-duplicate-plans', {
        preHandler: fastify.roleCheck(['admin'])
    }, removeDuplicatePlans)

    // Endpoint to remove old trial fields from users
    fastify.post('/remove-old-trial-fields', {
        preHandler: fastify.roleCheck(['admin'])
    }, removeOldTrialFields)
}

module.exports = AdminRoute;