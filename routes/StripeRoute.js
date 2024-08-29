const { createSubscriptionPayment, buyCredits, testingWebhook } = require("../controllers/stripeController");


async function StripeRoute(fastify, options) {
    fastify.post("/createSubscription", { preHandler: [fastify.verifyJWT] }, createSubscriptionPayment)

    fastify.post('/buy-credits', { preHandler: [fastify.verifyJWT] }, buyCredits)

}

module.exports = StripeRoute;