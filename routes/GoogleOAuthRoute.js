const { GoogleSignUp, GoogleCallback } = require("../controllers/GoogleOAuthController");


async function GoogleOAuthRoute(fastify, options) {
    fastify.get('/auth/signup', GoogleSignUp)

    fastify.get('/callback',GoogleCallback)
}

module.exports = GoogleOAuthRoute;