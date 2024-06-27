const Order = require('../models/OrderModel');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripe_sig = process.env.STRIPE_SIGNATURE
const enpoint = process.env.WEBHOOK_ENDPOINT
const url = "http://localhost:3001/api/stripe/check-payment-status"
const apiKey = process.env.APIKEY

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

const checkPaymentStatus = async (request, reply) => {
    const userId = request.user._id;
    const sig = request.headers['stripe-signature'];
    console.log("sig", sig)
    console.log('body', request.body)
    try {
        const order = await Order.findOne({ userId })
        console.log(order.sessionId)
        const session = await stripe.checkout.sessions.retrieve(order.sessionId)
        const event = await stripe.webhooks.constructEvent(session, sig, enpoint);
        console.log(event)
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    createSession,
    checkPaymentStatus
};
