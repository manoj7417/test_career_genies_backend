const { scanCV } = require("../controllers/CVScanController");

async function CVScanRoute(fastify, options) {
    // CV Scan endpoint - requires JWT authentication and multipart form data
    fastify.post("/scan", {
        preHandler: fastify.verifyJWT,
        config: {
            multipart: true,
        }
    }, scanCV);
}

module.exports = CVScanRoute;

