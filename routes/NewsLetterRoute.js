const { subscribeNewsletter } = require("../controllers/NewsLetterController");

async function NewsletterRoute(fastify, options) {

    fastify.post('/subscribe', subscribeNewsletter)
}

module.exports = NewsletterRoute;