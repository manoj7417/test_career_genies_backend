const { sendMessage } = require("../controllers/EmailController")



async function EmailRoute(fastify, options) {
    fastify.post('/send', sendMessage)
}

module.exports = EmailRoute