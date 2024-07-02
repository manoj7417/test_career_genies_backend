const { User } = require('../models/userModel');

require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT


const createSubscriptionPayment = async (request, reply) => {
    const userId = request.user._id;
    const { email, plan, duration, success_url, cancel_url } = request.body;
    try {
        let amount, stripeCheckoutUrl;
        switch (plan) {
            case 'free':
                amount = 0;
                break;
            case 'basic':
                amount = duration === 'monthly' ? 39900 : 335100;
                break;
            case 'premium':
                amount = duration === 'monthly' ? 99900 : 840000;
                break;
            default:
                return reply.code(400).send({
                    status: "FAILURE",
                    error: "Invalid plan selected"
                });
        }

        if (plan !== 'free') {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [{
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `Subscription Plan - ${plan}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                }],
                customer_email: email,
                success_url,
                cancel_url
            });

            stripeCheckoutUrl = session.url;
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'subscription.plan': plan,
                    'subscription.status': 'Pending',
                    'subscription.currentPeriodStart': new Date(),
                    'subscription.currentPeriodEnd': new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    'subscription.stripeCheckoutSessionId': session.id,
                }
            });

            reply.send({
                stripeCheckoutUrl,
                plan,
                amount: amount / 100
            });
        } else {
            // For free plan, update user's subscription directly
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'subscription.plan': plan,
                    'subscription.status': 'Active',
                    'subscription.currentPeriodStart': new Date(),
                    'subscription.currentPeriodEnd': new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                }
            });

            reply.send({
                status: "SUCCESS",
                message: "Free plan activated",
                plan,
                amount: 0
            });
        }
    } catch (err) {
        console.log(err);
        reply.status(500).send({ error: err.message });
    }
};

const webhook = async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.rawBody; // Ensure raw body is used here

    // console.log(`Headers: ${JSON.stringify(request.headers)}`);
    // console.log(`Raw Body: ${payload}`);

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
                await User.findOneAndUpdate(
                    { 'subscription.stripeCheckoutSessionId': sessionId },
                    {
                        'subscription.status': 'Active',
                        'subscription.currentPeriodStart': new Date(),
                        'subscription.currentPeriodEnd': new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    }
                );
                console.log('Subscription status updated to Active.');
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
                await User.findOneAndUpdate(
                    { 'subscription.stripeCheckoutSessionId': sessionId },
                    { 'subscription.status': 'Failed' }
                );
                console.log('Subscription status updated to Failed.');
            } catch (err) {
                console.error('Error updating order status to Failed:', err);
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    reply.status(200).send();
}



module.exports = {
    createSubscriptionPayment,
    webhook
};
