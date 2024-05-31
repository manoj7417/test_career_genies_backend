const { createSession } = require("../controllers/stripeController");

async function StripeRoute(fastify, options) {

    
    fastify.post("/create-checkout-session",  {preHandler: [fastify.verifyJWT]}, createSession)

  
}

module.exports = StripeRoute;