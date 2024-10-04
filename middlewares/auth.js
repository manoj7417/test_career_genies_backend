
require('dotenv').config()
async function apiKeyAuth(request, reply) {
    const excludedRoutes = ['/webhook', '/webhookrazorpay'];
    if (excludedRoutes.includes(request.raw.url)) {
        return;
    }
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.APIKEY) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}

module.exports = { apiKeyAuth }