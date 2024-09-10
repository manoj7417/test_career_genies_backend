const { preSignedUrl } = require("../controllers/UploadController");

async function UploadRoute(fastify, options) {
    fastify.post('/preSignedUrl', preSignedUrl)

}

module.exports = UploadRoute;