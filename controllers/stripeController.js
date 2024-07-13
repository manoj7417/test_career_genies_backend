const { Payment } = require('../models/PaymentModel');
const { User } = require('../models/userModel');

require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT


const createSubscriptionPayment = async (request, reply) => {
    const userId = request.user._id;
    const { email, plan, duration, success_url, cancel_url } = request.body;

    try {
        let amount, stripeCheckoutUrl;
        let analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0;
        let currentPeriodEnd;

        // Determine plan amount and tokens
        switch (plan) {
            case 'free':
                amount = 0;
                break;
            case 'basic':
                amount = duration === 'monthly' ? 39900 : 335100;
                analyserTokens = duration === 'monthly' ? 10 : 10 * 12;
                optimizerTokens = duration === 'monthly' ? 10 : 10 * 12;
                JobCVTokens = duration === 'monthly' ? 10 : 10 * 12;
                careerCounsellingTokens = duration === 'monthly' ? 10 : 10 * 12; // Example value
                currentPeriodEnd = duration === 'monthly' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
                break;
            case 'premium':
                amount = duration === 'monthly' ? 99900 : 839100;
                analyserTokens = duration === 'monthly' ? 1000 : 1000 * 12;
                optimizerTokens = duration === 'monthly' ? 1000 : 1000 * 12;
                JobCVTokens = duration === 'monthly' ? 1000 : 1000 * 12;
                careerCounsellingTokens = duration === 'monthly' ? 1000 : 1000 * 12;
                currentPeriodEnd = duration === 'monthly' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
                break;
            default:
                return reply.code(400).send({
                    status: "FAILURE",
                    error: "Invalid plan selected"
                });
        }

        // Create Stripe Checkout session
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

        // Create a new payment record
        const payment = new Payment({
            user: userId,
            amount: amount,
            status: 'Pending',
            plan: plan,
            planType: duration,
            sessionId: session.id,
            analyserTokens: analyserTokens,
            optimizerTokens: optimizerTokens,
            jobCVTokens: JobCVTokens,
            careerCounsellingTokens: careerCounsellingTokens,
            expiryDate: currentPeriodEnd
        });

        await payment.save();

        reply.send({
            stripeCheckoutUrl,
            plan,
            amount: amount / 100
        });

    } catch (err) {
        console.log(err);
        reply.status(500).send({ error: err.message });
    }
};




const webhook = async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.rawBody;
    let event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
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
                const payment = await Payment.findOne({ sessionId });
                if (!payment) {
                    console.error(`Payment record not found for session ID: ${sessionId}`);
                    return reply.status(404).send('Payment record not found');
                }

                await User.findByIdAndUpdate(payment.user, {
                    $set: {
                        'subscription.status': 'Active',
                        'subscription.plan': payment.plan,
                        'subscription.planType': payment.planType,
                        'subscription.currentPeriodStart': new Date(),
                        'subscription.currentPeriodEnd': payment.expiryDate,
                        'subscription.stripeCheckoutSessionId': sessionId,
                        'subscription.paymentId': payment._id,
                        'subscription.analyserTokens': payment.analyserTokens,
                        'subscription.optimizerTokens': payment.optimizerTokens,
                        'subscription.JobCVTokens': payment.jobCVTokens,
                        'subscription.careerCounsellingTokens': payment.careerCounsellingTokens
                    }
                });

                console.log('Subscription status updated to Active.');
            } catch (err) {
                console.error('Error updating subscription status to Active:', err);
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
                const payment = await Payment.findOne({ sessionId: sessionId });

                if (!payment) {
                    console.error(`Payment record not found for session ID: ${sessionId}`);
                    return reply.status(404).send('Payment record not found');
                }

                // Update the payment status to failed
                await Payment.findByIdAndUpdate(payment._id, { status: 'Failed' });

                console.log('Payment status updated to Failed.');
            } catch (err) {
                console.error('Error updating subscription status to Failed:', err);
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
