const { createSubscriptionPayment, buyCredits, payCoach, bookCoachSlot } = require("../controllers/stripeController");


async function StripeRoute(fastify, options) {
    fastify.post("/createSubscription", { preHandler: [fastify.verifyJWT] }, createSubscriptionPayment)

    fastify.post('/buy-credits', { preHandler: [fastify.verifyJWT] }, buyCredits)

    fastify.post('/payCoach', { preHandler: [fastify.verifyJWT] }, payCoach)

    fastify.post("/bookCoachSlot", {
        preHandler: [fastify.verifyJWT]
    }, bookCoachSlot)
}

module.exports = StripeRoute;