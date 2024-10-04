
require('dotenv').config()
async function apiKeyAuth(request, reply) {
    const excludedRoutes = ['/webhook', '/webhookrazorpay'];
    console.log(request.raw.url)
    if (excludedRoutes.includes(request.raw.url)) {
        return;
    }

    const apiKey = request.headers['x-api-key'];
    console.log(apiKey)
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}




module.exports = { apiKeyAuth }