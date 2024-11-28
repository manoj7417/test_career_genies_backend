
require('dotenv').config()
async function apiKeyAuth(request, reply) {
    const excludedRoutes = ['/webhook', '/webhookrazorpay', '/api/google'];
    const urlPath = request.raw.url.split('?')[0]; 
    if (excludedRoutes.some(route => urlPath.startsWith(route))) {
        return; 
    }
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.APIKEY) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}

module.exports = { apiKeyAuth }