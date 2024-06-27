const { createSession, checkPaymentStatus } = require("../controllers/stripeController");

async function StripeRoute(fastify, options) {
    fastify.post("/create-checkout-session", { preHandler: [fastify.verifyJWT] }, createSession)

    fastify.post("/check-payment-status", { preHandler: [fastify.verifyJWT] }, checkPaymentStatus)
}

module.exports = StripeRoute;