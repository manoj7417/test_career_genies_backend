
require('dotenv').config()
async function apiKeyAuth(request, reply) {
    // In onRequest hook, use request.raw.url for the actual URL path
    const rawUrl = request.raw ? request.raw.url : request.url;
    let urlPath = rawUrl ? rawUrl.split('?')[0] : '';
    
    // Normalize the path (remove trailing slash except for root)
    if (urlPath.length > 1 && urlPath.endsWith('/')) {
        urlPath = urlPath.slice(0, -1);
    }
    
    const method = request.raw ? request.raw.method : request.method;
    
    // Excluded routes that don't require API key
    const excludedRoutes = [
        '/webhook',
        '/webhookrazorpay',
        '/api/google',
        '/health'
    ];
    
    // Allow GET requests to root path for health checks
    if (method === 'GET' && (urlPath === '/' || urlPath === '')) {
        return;
    }
    
    // Check if the route is in the excluded list
    const isExcluded = excludedRoutes.some(route => {
        return urlPath === route || urlPath.startsWith(route + '/');
    });
    
    if (isExcluded) {
        return;
    }
    
    // Require API key for all other routes
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.APIKEY) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}

module.exports = { apiKeyAuth }