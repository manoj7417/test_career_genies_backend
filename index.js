const fastify = require('fastify')({
    logger: false
});

const path = require('path');
const DBConnection = require('./config/db');
const { apiKeyAuth } = require('./middlewares/auth');
const roleCheck = require('./middlewares/RoleBasedAccessControl');
const verifyJWT = require('./middlewares/verifyJwt');
const ResumeRoute = require('./routes/ResumeRoute');
const UserRoute = require('./routes/UserRoute');
const StripeRoute = require('./routes/StripeRoute');
const OpenaiRoute = require('./routes/OpenaiRoute');
const PrintResume = require('./routes/PrintResume');
const cors = require('@fastify/cors');
const cookie = require('@fastify/cookie');
const multer = require('fastify-multer');
const fastifyRawBody = require('fastify-raw-body');
const { webhook } = require('./controllers/stripeController');

require('dotenv').config();

// Register plugins
fastify.register(cookie);
fastify.register(require('@fastify/swagger'), {
    openapi: {
        openapi: '3.0.0',
        info: {
            title: 'Test swagger',
            description: 'Testing the Fastify swagger API',
            version: '0.1.0'
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT}/docs`,
                description: 'Development server'
            }
        ],
        tags: [
            { name: 'user', description: 'User related end-points' },
            { name: 'code', description: 'Code related end-points' }
        ],
        components: {
            securitySchemes: {
                apiKey: {
                    type: 'apiKey',
                    name: 'apiKey',
                    in: 'header'
                }
            }
        },
        externalDocs: {
            url: 'https://swagger.io',
            description: 'Find more info here'
        }
    }
});

fastify.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
});

fastify.register(cors, {
    origin: [
        "http://localhost:3000", 
        "http://localhost:3002", 
        'https://careergenie-24.vercel.app', 
        'https://career-genies-frontend.vercel.app', 
        'https://testing-cg-frontend.vercel.app'
    ],
    allowedHeaders: ["Content-Type", "Accept", "Authorization", "x-api-key"],
    credentials: true
});

fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'uploads'),
    prefix: '/uploads',
});

fastify.decorate('verifyJWT', verifyJWT);
fastify.decorate('roleCheck', roleCheck);

const storage = multer.memoryStorage();
fastify.register(multer.contentParser);

fastify.register(UserRoute, { prefix: '/api/user', before: apiKeyAuth });
fastify.register(ResumeRoute, { prefix: '/api/resume', before: apiKeyAuth });
fastify.register(OpenaiRoute, { prefix: '/api/openai', before: apiKeyAuth });
fastify.register(PrintResume, { prefix: "/api/print", before: apiKeyAuth });
fastify.register(StripeRoute, { prefix: "/api/stripe", before: apiKeyAuth });

fastify.post("/webhook", {
    config: {
        rawBody: true,
    }
}, webhook);

const start = async () => {
    try {
        await DBConnection();
        await fastify.listen({ port: process.env.PORT || 3009, host: '0.0.0.0' });
        fastify.log.info(`Server started on PORT ${fastify.server.address().port}`);
    } catch (error) {
        console.log(error);
        fastify.log.info("Server connection error");
    }
};

start();
