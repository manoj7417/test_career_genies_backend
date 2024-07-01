const { createSubscriptionPayment } = require("../controllers/stripeController");


async function StripeRoute(fastify, options) {
    fastify.post("/createSubscription", { preHandler: [fastify.verifyJWT] }, createSubscriptionPayment)


}

module.exports = StripeRoute;