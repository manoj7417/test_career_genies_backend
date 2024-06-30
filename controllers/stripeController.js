const Order = require('../models/OrderModel');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT


const createSession = async (request, reply) => {
    const userId = request.user._id
    const { amount, email, name, url, cancel_url, templateName, temp_type } = request.body;

    const amountInCents = Math.round(amount * 100);

    const line_items = [{
        price_data: {
            currency: 'usd',
            product_data: {
                name: name,
                description: temp_type,
            },
            unit_amount: amountInCents,
        },
        quantity: 1
    }];

    try {
        const host = request.headers.host;
        const protocol = request.headers['x-forwarded-proto'] || request.protocol;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: line_items,
            success_url: url,
            cancel_url: cancel_url
        });
        const paymentDetails = {
            paymentMethod: session.payment_method_types,
            paymentDate: session.created
        }
        const isTemplatePurchased = await Order.findOne({ userId, templateName: name })
        if (isTemplatePurchased && isTemplatePurchased.paymentStatus === 'Completed') {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Template already purchased"
            })
        }

        if (isTemplatePurchased && isTemplatePurchased.paymentStatus === 'Pending') {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Your payment for this template is pending"
            })
        }
        const order = new Order({ userId, paymentDetails, totalAmount: amount, templateName: name, sessionId: session.id })
        await order.save()
        reply.send({ url: session.url, templateName: templateName, amount: amount, sessionId: order.sessionId });
    } catch (err) {
        console.log(err)
        reply.status(500).send({ error: err.message });
    }

    return session;
};


const webhook = async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.body; // Ensure raw body is used here

    // console.log(request.body);
    const payloadString = JSON.stringify(payload, null, 2);
    console.log(payloadString)

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
};



module.exports = {
    createSession,
    webhook
};
