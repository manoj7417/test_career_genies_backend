const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createSession = async (request, reply) => {
    const { amount, email, name, url, cancel_url, templateName } = request.body;

    // Convert the amount to cents
    const amountInCents = Math.round(amount * 100);

    const line_items = [{
        price_data: {
            currency: 'usd',
            product_data: {
                name: 'template',
                description: 'premium template',
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
            cancel_url: cancel_url,
        });

        reply.send({ url: session.url, templateName: templateName, userId: request.user._id, amount: amount });
    } catch (err) {
        reply.status(500).send({ error: err.message });
    }

    return session;
};

module.exports = {
    createSession
};
