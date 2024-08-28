const { Payment } = require('../models/PaymentModel');
const { User } = require('../models/userModel');
const path = require('path')
const fs = require('fs');
const { sendEmail } = require('../utils/nodemailer');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT
const invoiceTemplatePath = path.join(__dirname, '..', "emailTemplates", 'InvoiceTemplate.html')
const crypto = require('crypto');
const { pricing } = require('../constants/pricing');


const getPricing = (currency, planName) => {
    const plan = pricing[planName]?.[currency] || null;
    return plan
}

const getPlanName = (planName) => {
    const plan = pricing[planName] || null;
    return plan?.name
}

const createSubscriptionPayment = async (req, res) => {
    const userId = req.user._id;
    let { email, success_url, cancel_url, currency, planName, duration } = req.body;
    try {
        let analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0, downloadCVTokens = 0;
        const price = getPricing(currency, planName)
        const amount = price.price
        const plan = getPlanName(planName)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: `Subscription Plan - ${plan}`,
                    },
                    unit_amount: amount * 100,
                },
                quantity: 1,
            }],
            customer_email: email,
            success_url,
            cancel_url
        });
        if (planName === 'CVSTUDIO') {
            analyserTokens = 20
            optimizerTokens = 20
            JobCVTokens = 20,
                downloadCVTokens = 20
        }
        if (planName === 'AICareerCoach') {
            careerCounsellingTokens = 1
        }
        const currentPeriodEnd = duration === 'monthly' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        const payment = new Payment({
            user: userId,
            amount: amount,
            status: 'Pending',
            plan: planName,
            planType: duration,
            sessionId: session.id,
            analyserTokens: {
                credits: analyserTokens,
                expiry: currentPeriodEnd
            },
            optimizerTokens: {
                credits: optimizerTokens,
                expiry: currentPeriodEnd
            },
            jobCVTokens: {
                credits: JobCVTokens,
                expiry: currentPeriodEnd
            },
            careerCounsellingTokens: {
                credits: careerCounsellingTokens,
                expiry: currentPeriodEnd
            },
            downloadCVTokens: downloadCVTokens,
            expiryDate: currentPeriodEnd
        });
        await payment.save();
        return res.status(200).send({
            url: session.url
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error"
        })
    }
}


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
                    return reply.status(404).send('Payment record not found');
                }
                if (payment.plan === 'ADD-CREDITS') {
                    const user = await User.findById(payment.user);
                    if (payment.addCredits.serviceName === 'CVCreator') {
                        user.subscription.downloadCVTokens.credits += payment.addCredits.credits
                    }
                    if (payment.addCredits.serviceName === 'CVOptimiser') {
                        user.subscription.optimizerTokens.credits += payment.addCredits.credits
                        user.subscription.analyserTokens.credits += payment.addCredits.credits
                    }
                    if (payment.addCredits.serviceName === 'CVMatch') {
                        user.subscription.JobCVTokens.credits += payment.addCredits.credits
                    }
                    await user.save();
                    break;
                }
                const user = await User.findById(payment.user);
                const customerEmail = user.email;

                await User.findByIdAndUpdate(payment.user, {
                    $set: {
                        'subscription.status': 'Completed',
                        'subscription.plan': [...user.subscription.plan, payment.plan],
                        'subscription.planType': payment.planType,
                        'subscription.currentPeriodStart': new Date(),
                        'subscription.currentPeriodEnd': payment.expiryDate,
                        'subscription.stripeCheckoutSessionId': sessionId,
                        'subscription.paymentId': payment._id,
                        'subscription.analyserTokens': payment.analyserTokens,
                        'subscription.optimizerTokens': payment.optimizerTokens,
                        'subscription.JobCVTokens': payment.jobCVTokens,
                        'subscription.careerCounsellingTokens': payment.careerCounsellingTokens,
                        'subscription.downloadCVTokens': payment.downloadCVTokens
                    }
                });
                const date = new Date(payment.expiryDate);
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                const formattedDate = date.toLocaleDateString('en-US', options);
                const invoiceTemplate = fs.readFileSync(invoiceTemplatePath, "utf-8");
                const planName = getPlanName(payment.plan)
                const { symbol } = getPricing(payment.currency, planName)
                const price = `${symbol}-${payment.amount}`
                const invoiceBody = invoiceTemplate.replace('{fullname}', user.fullname).replace('{plan_type}', planName).replace('{payment_amount}', price).replace('{validity_date}', formattedDate)
                await sendEmail(customerEmail, "Genie's Career Hub: Payment Successful", invoiceBody);
                break;
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

                await Payment.findByIdAndUpdate(payment._id, { status: 'Failed' });

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

const razorpayWebhook = async (request, reply) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const invoiceTemplatePath = path.join(__dirname, '..', "emailTemplates", 'InvoiceTemplate.html');
    // Log the incoming request for debugging
    // Verify the webhook signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(request.body));
    const digest = shasum.digest('hex');

    // Log the signature verification process


    if (digest !== request.headers['x-razorpay-signature']) {
        console.error('Invalid signature');
        return reply.code(400).send({ message: 'Invalid signature' });
    }

    // Handle the payment captured event
    const event = request.body.event;
    const payload = request.body.payload;


    if (event == 'order.paid') {

        const order = payload.order.entity;

        if (order.status == 'paid') {
            try {
                // Find the payment record by orderId
                const payment = await Payment.findOne({ sessionId: order.id });
                if (!payment) {
                    console.error(`Payment record not found for order ID: ${order.id}`);
                    return reply.status(404).send('Payment record not found');
                }

                payment.status = 'Completed';
                await payment.save();

                // Find the user associated with the payment
                const user = await User.findById(payment.user);
                if (!user) {
                    console.error(`User not found for ID: ${payment.user}`);
                    return reply.status(404).send('User not found');
                }

                // Update user subscription status
                user.subscription.status = 'Active';
                user.subscription.plan = payment.plan;
                user.subscription.planType = payment.planType;
                user.subscription.currentPeriodStart = new Date();
                user.subscription.currentPeriodEnd = payment.expiryDate;
                user.subscription.razorpayOrderId = payment.orderId;
                user.subscription.paymentId = payment._id;
                user.subscription.analyserTokens = payment.analyserTokens;
                user.subscription.optimizerTokens = payment.optimizerTokens;
                user.subscription.JobCVTokens = payment.jobCVTokens;
                user.subscription.careerCounsellingTokens = payment.careerCounsellingTokens;
                await user.save();

                // Send confirmation email to the user
                const templateAmount = "₹" + payment.amount;
                const date = new Date(payment.expiryDate);
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                const formattedDate = date.toLocaleDateString('en-US', options);
                const invoiceTemplate = fs.readFileSync(invoiceTemplatePath, "utf-8");
                const invoiceBody = invoiceTemplate
                    .replace('{fullname}', user.fullname)
                    .replace('{plan_type}', payment.plan)
                    .replace('{payment_amount}', templateAmount)
                    .replace('{validity_date}', formattedDate);

                await sendEmail(user.email, "Genie's Career Hub: Payment Successful", invoiceBody);

                return reply.code(200).send({ message: 'Payment captured successfully' });
            } catch (err) {
                console.error('Error processing payment captured event:', err);
                return reply.status(500).send({ message: 'Internal Server Error' });
            }
        }
    } else {
        console.log(`Unhandled event type ${event}`);
    }

    reply.status(200).send();
};


const buyCredits = async (request, reply) => {
    const userId = request.user._id;
    let { email, success_url, cancel_url, currency, serviceName, amount, credits } = request.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return reply.status(404).send('User not found');
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: `Add Credits`,
                    },
                    unit_amount: amount * 100,
                },
                quantity: 1,
            }],
            customer_email: email,
            success_url,
            cancel_url
        });

        const payment = new Payment({
            user: userId,
            sessionId: session.id,
            status: 'Pending',
            currency: currency,
            amount: amount,
            plan: "ADD-CREDITS",
            planType: 'monthly',
            addCredits: {
                serviceName,
                credits: Number(credits)
            },
            expiryDate: Date.now()
        })
        await payment.save();
        console.log(session.url)
        return reply.status(200).send({ url: session.url });
    } catch (error) {
        console.log("Error adding credits", error)
        return reply.status(500).send('Error processing payment');
    }
}



module.exports = {
    createSubscriptionPayment,
    webhook,
    razorpayWebhook,
    getPricing,
    buyCredits
};
