const fastify = require('fastify')({
    logger: false
});
fastify.register(require('@fastify/formbody'));
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
const Order = require('./models/OrderModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT;

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

// Register the routes
fastify.register(UserRoute, { prefix: '/api/user', before: apiKeyAuth });
fastify.register(ResumeRoute, { prefix: '/api/resume', before: apiKeyAuth });
fastify.register(OpenaiRoute, { prefix: '/api/openai', before: apiKeyAuth });
fastify.register(PrintResume, { prefix: "/api/print", before: apiKeyAuth });
fastify.register(StripeRoute, { prefix: "/api/stripe", before: apiKeyAuth });

// Register webhook route with custom preHandler to parse raw body
fastify.post("/webhook", {
    preHandler: (request, reply, done) => {
        request.rawBody = '';
        request.raw.on('data', chunk => {
            request.rawBody += chunk;
        });
        request.raw.on('end', () => {
            done();
        });
    }
}, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.rawBody; // Ensure raw body is used here

    console.log(`Headers: ${JSON.stringify(request.headers)}`);
    console.log(`Raw Body: ${payload}`);

    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
        console.log(`Received event: ${event.type}`);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return reply.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id
            });
            const sessionId = sessions.data[0].id;
            try {
                await Order.findOneAndUpdate(
                    { sessionId },
                    { paymentStatus: 'Completed', 'paymentDetails.paymentDate': Date.now() }
                );
                console.log('Order updated to Completed status.');
            } catch (err) {
                console.error('Error updating order status to Completed:', err);
            }
            break;
        }

        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id
            });
            const sessionId = sessions.data[0].id;
            try {
                await Order.findOneAndUpdate(
                    { sessionId },
                    { paymentStatus: 'Failed', 'paymentDetails.paymentDate': Date.now() }
                );
                console.log('Order updated to Failed status.');
            } catch (err) {
                console.error('Error updating order status to Failed:', err);
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    reply.status(200).send();
});

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
