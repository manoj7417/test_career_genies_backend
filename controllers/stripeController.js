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
const { symbols } = require('../constants/symbols');
const { CoachPayment } = require('../models/CoachPaymentModel');
const { Coach } = require('../models/CoachModel');
const { Booking } = require('../models/BookingModel');
const moment = require('moment');


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
        const user = await User.findById(userId)
        if (!user) {
            return res.code(404).send({ status: "FAILURE", message: "User not found" });
        }
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
            downloadCVTokens: {
                credits: downloadCVTokens,
                expiry: currentPeriodEnd
            },
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

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id
            });
            const session = sessions.data[0];
            const sessionId = session.id;

            try {
                // Check if it's a coach payment
                if (session.metadata?.type === 'coachPayment') {
                    // Handle coach payment logic
                    const coachPayment = await CoachPayment.findOne({ sessionId });

                    if (!coachPayment) {
                        return reply.status(404).send('Coach payment record not found');
                    }

                    coachPayment.status = 'Completed';
                    await coachPayment.save();

                    // Add any other coach-specific actions here

                    return reply.status(200).send({ message: 'Coach payment completed successfully' });
                } else if (session.metadata?.type === 'slotBooking') {
                    const booked = await Booking.findOne({ sessionId });

                    if (!booked) {
                        return reply.status(404).send('Booking record not found');
                    }
                    booked.status = 'booked';
                    await booked.save();
                    const coachId = booked.coachId;
                    const userId = booked.userId;
                    const coach = await Coach.findById(coachId);
                    if (!coach) {
                        return reply.status(404).send('Coach not found');
                    }

                    const user = await User.findById(userId);
                    if (!user) {
                        return reply.status(404).send('User not found');
                    }

                    const coachHtml = `<div>
        <h2>Meeting Details</h2>
        <p>User: ${user.fullname}</p>
        <p>Date: ${moment(booked.date).format('LL')}</p>
        <p>Slot Time: ${booked.slotTime.startTime}-${booked.slotTime.endTime} , ${booked.timezone}</p>
        <p>Notes: ${booked.notes}</p>
        <p>Please make sure to arrive at the scheduled time to join the meeting.</p>
        <p>To join the meeting, please visit the following link:</p>
        </div>`;
                    await sendEmail(coach.email, "Career coaching meeting scheduled", coachHtml)
                    const userHtml = `<div>
        <h2>Meeting Details</h2>
        <p>Coach: ${coach.name}</p>
        <p>Date: ${moment(booked.date).format('LL')}</p>
        <p>Slot Time: ${booked.slotTime.startTime}-${booked.slotTime.endTime} , ${booked.timezone}</p>
        <p>Notes: ${booked.notes}</p>
        <p>To join the meeting, please visit the following link:</p>`

                    await sendEmail(user.email, "Career coaching meeting scheduled", userHtml)
                    // Add any other coach-specific actions here
                    return reply.status(200).send({ message: 'Slot booked successfully' });
                } else {
                    // Handle regular subscription payment logic
                    const payment = await Payment.findOne({ sessionId });

                    if (!payment) {
                        return reply.status(404).send('Payment record not found');
                    }

                    payment.status = 'Completed';
                    await payment.save();

                    const user = await User.findById(payment.user);
                    if (!user) {
                        return reply.status(404).send('User not found');
                    }

                    // Update user subscription
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
                            'subscription.downloadCVTokens': payment.downloadCVTokens,
                            payments: [...user.payments, payment._id]
                        }
                    });

                    return reply.status(200).send({ message: 'Subscription payment completed successfully' });
                }
            } catch (err) {
                console.error('Error processing payment:', err);
                return reply.status(500).send('Internal server error');
            }
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id
            });
            const session = sessions.data[0];
            const sessionId = session.id;

            try {
                if (session.metadata?.type === 'coachPayment') {
                    await CoachPayment.findOneAndUpdate({ sessionId }, { status: 'Failed' });
                } else if (session.metadata?.type === 'slotBooking') {
                    await Booking.findOneAndUpdate({ sessionId }, { status: 'cancelled' });
                } else {
                    await Payment.findOneAndUpdate({ sessionId }, { status: 'Failed' });
                }
            } catch (err) {
                console.error('Error updating payment status to Failed:', err);
            }
            break;
        }
        default:

    }

    reply.status(200).send();
};


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

const payCoach = async (request, reply) => {
    const { amount, currency, coachId, programId, success_url, cancel_url } = await request.body;
    const userId = request.user._id;
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency,
                    unit_amount: amount * 100,  // Amount should be multiplied by 100 for Stripe
                    product_data: {
                        name: 'Coach Subscription'
                    }
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url,
            cancel_url,
            metadata: {
                type: 'coachPayment'
            }
        });

        const payment = new CoachPayment({
            user: userId,
            amount,
            currency,
            status: 'Pending',
            coachId,
            programId: programId,
            sessionId: session.id
        });
        await payment.save();
        return reply.status(200).send({ url: session.url });
    } catch (error) {
        console.log("Error processing coach payment", error);
        return reply.status(500).send('Error processing payment');
    }
};

const bookCoachSlot = async (req, res) => {
    const userId = req.user._id;
    const { slotTime, coachId, timezone, notes, date, success_url, cancel_url, amount, currency, city, country } = req.body;
    try {
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).send('Coach not found');
        }
        const isSlotBooked = await Booking.findOne({ coachId, slotTime, date, status: "booked" });
        if (isSlotBooked) {
            return res.status(409).send({
                status: "FAILURE",
                message: "Slot is already booked"
            });
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency,
                    unit_amount: amount * 100,
                    product_data: {
                        name: 'Slot Booking'
                    }
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url,
            cancel_url,
            metadata: {
                type: 'slotBooking'
            }
        });

        const newBooking = new Booking({
            userId,
            coachId,
            slotTime,
            timezone,
            notes,
            date,
            sessionId: session.id,
            city,
            country
        });
        await newBooking.save();
        return res.status(200).send({
            status: "SUCCESS",
            message: "Slot booked successfully",
            url: session.url
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
};


module.exports = {
    createSubscriptionPayment,
    webhook,
    razorpayWebhook,
    getPricing,
    buyCredits,
    payCoach,
    bookCoachSlot
};
