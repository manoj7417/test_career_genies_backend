const { Payment } = require('../models/PaymentModel');
const { User } = require('../models/userModel');
const path = require('path')
const fs = require('fs');
const { sendEmail } = require('../utils/nodemailer');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT
const invoiceTemplatePath = path.join(__dirname, '..', "emailTemplates", 'InvoiceTemplate.html')
const userAppointmentTemp = path.join(__dirname, '..', "emailTemplates", 'userAppointmentTemp.html')
const coachAppointmentTemplate = path.join(__dirname, '..', "emailTemplates", 'coachAppointmentTemp.html')
const newEnrollmentTemplate = path.join(__dirname, '..', "emailTemplates", 'newEnrollmentTemplate.html')
const userEnrollmentTemplate = path.join(__dirname, '..', "emailTemplates", 'userProgrammEnrollTemplate.html')
const crypto = require('crypto');
const { pricing } = require('../constants/pricing');
const { CoachPayment } = require('../models/CoachPaymentModel');
const { Coach } = require('../models/CoachModel');
const { Booking } = require('../models/BookingModel');
const moment = require('moment');
const schedule = require('node-schedule');

const getPricing = (currency, planName) => {
    const plan = pricing[planName]?.[currency] || null;
    return plan
}

const getPlanName = (planName) => {
    const plan = pricing[planName] || null;
    return plan?.name
}

//old code 
// const createSubscriptionPayment = async (req, res) => {

//     console.log("req.body", req.body);
//     const userId = req.user._id;
//     let { email, success_url, cancel_url, currency, planName, duration } = req.body;

//     const { discount } = req.body;

//     if (discount == 100) {
//         try {
//             const user = await User.findById(userId);

//             if (!user) {
//                 return res.status(404).send({ status: "FAILURE", message: "User not found" });
//             }

//             if (user.trial.status === "Active") {
//                 return res.status(200).send({ status: "FAILURE", error: "Trial coupon already redeemed" });
//             }

//             // if (user?.trial?.expiryDate && user.trial.expiryDate < new Date()) {
//             //     return res.status(403).send({ status: "FAILURE", message: "Trial period has ended" });
//             // }

//             const price = getPricing(currency, planName);
//             const amount = price?.price || 0;
//             const plan = getPlanName(planName);
//             if (!amount || !plan) {
//                 return res.status(400).send({ status: "FAILURE", message: "Invalid plan details" });
//             }

//             // Check if the customer already exists in Stripe
//             let stripeCustomerId = user.stripeCustomerId;

//             if (!stripeCustomerId) {
//                 // Create a new Stripe customer if not already linked
//                 const customer = await stripe.customers.create({
//                     email: email,
//                     metadata: {
//                         userId: user._id.toString(),
//                     },
//                 });

//                 stripeCustomerId = customer.id;

//                 // Save the Stripe customer ID in the user record
//                 user.stripeCustomerId = stripeCustomerId;
//                 await user.save();
//             }

//             const setupIntent = await stripe.setupIntents.create({
//                 payment_method_types: ['card'],
//                 customer: stripeCustomerId,
//                 usage: 'off_session',
//                 metadata: {
//                     payment: "delayedPayment",
//                 },
//             });

//             const payment = new Payment({
//                 user: userId,
//                 amount: amount,
//                 currency: currency,
//                 status: 'Pending',
//                 plan: planName,
//                 planType: "trial",
//                 setupIntentId: setupIntent.id,
//                 expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
//             });
//             await payment.save();
//             schedule.scheduleJob(payment._id.toString(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
//                 , async () => {
//                     try {
//                         const delayedPayment = await Payment.findById(payment._id);
//                         if (delayedPayment && delayedPayment.status === 'Ready for Charge') {
//                             const chargeResult = await chargeDelayedPayment(delayedPayment._id);
//                             console.log(`Payment ${payment._id} processed:`, chargeResult);
//                         } else {
//                             console.log(`Payment ${payment._id} not ready for charge.`);
//                         }
//                     } catch (error) {
//                         console.error(`Failed to process payment ${payment._id}:`, error.message);
//                     }
//                 });

//             user.trial.status = "Active";
//             user.trial.expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
//             await user.save();
//             if (!user) {
//                 return res.status(404).send({ status: "FAILURE", message: "User not found" });
//             }

//             return res.status(200).send({
//                 clientSecret: setupIntent.client_secret, // Pass the client secret for frontend use
//                 message: "Setup link created. Card details need to be provided.",
//             });

//         } catch (error) {
//             console.error("Error creating delayed payment link:", error.message);
//             return res.status(500).send({ status: "FAILURE", error: error.message });
//         }
//     }
//     try {
//         const user = await User.findById(userId)
//         if (!user) {
//             return res.code(404).send({ status: "FAILURE", message: "User not found" });
//         }
//         let analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0, downloadCVTokens = 0;
//         const price = getPricing(currency, planName)
//         const amount = price.price
//         const plan = getPlanName(planName)
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             mode: 'payment',
//             line_items: [{
//                 price_data: {
//                     currency: currency,
//                     product_data: {
//                         name: `Subscription Plan - ${plan}`,
//                     },
//                     unit_amount: duration === 'monthly' ? amount * 100 : amount * 10 * 100,
//                 },
//                 quantity: 1,
//             }],
//             customer_email: email,
//             success_url,
//             cancel_url
//         });
//         if (planName === 'CVSTUDIO') {
//             analyserTokens = 20
//             optimizerTokens = 20
//             JobCVTokens = 20,
//                 downloadCVTokens = 20
//         }
//         if (planName === 'AICareerCoach') {
//             careerCounsellingTokens = 1
//         }
//         const currentPeriodEnd = duration === 'monthly' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
//         const payment = new Payment({
//             user: userId,
//             amount: duration === 'monthly' ? amount : amount * 10,
//             status: 'Pending',
//             currency: currency,
//             plan: planName,
//             planType: duration,
//             sessionId: session.id,
//             analyserTokens: {
//                 credits: analyserTokens,
//                 expiry: currentPeriodEnd
//             },
//             optimizerTokens: {
//                 credits: optimizerTokens,
//                 expiry: currentPeriodEnd
//             },
//             jobCVTokens: {
//                 credits: JobCVTokens,
//                 expiry: currentPeriodEnd
//             },
//             careerCounsellingTokens: {
//                 credits: careerCounsellingTokens,
//                 expiry: currentPeriodEnd
//             },
//             downloadCVTokens: {
//                 credits: downloadCVTokens,
//                 expiry: currentPeriodEnd
//             },
//             expiryDate: currentPeriodEnd
//         });
//         await payment.save();
//         return res.status(200).send({
//             url: session.url
//         })
//     } catch (error) {
//         console.log(error);
//         return res.status(500).send({
//             status: "FAILURE",
//             error: error.message || "Internal server error"
//         })
//     }
// }


//new code 
// const createSubscriptionPayment = async (req, res) => {
//     console.log("req.body", req.body);

//     const userId = req.user._id;
//     const { email, success_url, cancel_url, currency, duration, plan, planName } = req.body;

//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).send({ status: "FAILURE", message: "User not found" });
//         }

//         // Define token allocations based on planName
//         let analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0, downloadCVTokens = 0;

//         // Determine price from frontend data
//         const priceString = plan?.price?.[duration]; // e.g., "£9.99"
//         if (!priceString) {
//             return res.status(400).send({ status: "FAILURE", message: "Invalid price information" });
//         }

//         const amount = parseFloat(priceString.replace(/[^\d.]/g, ''));
//         const planDisplayName = plan?.name || "Subscription Plan";

//         if (!amount || isNaN(amount)) {
//             return res.status(400).send({ status: "FAILURE", message: "Invalid pricing format" });
//         }

//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             mode: 'payment',
//             line_items: [{
//                 price_data: {
//                     currency: currency.toLowerCase(),
//                     product_data: {
//                         name: `${planDisplayName} - ${duration}`,
//                     },
//                     unit_amount: amount * 100, // Stripe expects the amount in smallest currency unit
//                 },
//                 quantity: 1,
//             }],
//             customer_email: email,
//             success_url,
//             cancel_url,
//         });

//         // Example token assignment based on planName
//         if (planName === 'cvstudio') {
//             analyserTokens = 20;
//             optimizerTokens = 20;
//             JobCVTokens = 20;
//             downloadCVTokens = 20;
//         }

//         if (planName === 'aicareercoach') {
//             careerCounsellingTokens = 1;
//         }

//         const currentPeriodEnd = duration === 'monthly'
//             ? new Date(new Date().setMonth(new Date().getMonth() + 1))
//             : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

//         const payment = new Payment({
//             user: userId,
//             amount: amount,
//             status: 'Pending',
//             currency: currency,
//             plan: planName,
//             planType: duration,
//             sessionId: session.id,
//             analyserTokens: {
//                 credits: analyserTokens,
//                 expiry: currentPeriodEnd,
//             },
//             optimizerTokens: {
//                 credits: optimizerTokens,
//                 expiry: currentPeriodEnd,
//             },
//             jobCVTokens: {
//                 credits: JobCVTokens,
//                 expiry: currentPeriodEnd,
//             },
//             careerCounsellingTokens: {
//                 credits: careerCounsellingTokens,
//                 expiry: currentPeriodEnd,
//             },
//             downloadCVTokens: {
//                 credits: downloadCVTokens,
//                 expiry: currentPeriodEnd,
//             },
//             expiryDate: currentPeriodEnd,
//         });

//         await payment.save();

//         return res.status(200).send({
//             url: session.url,
//         });

//     } catch (error) {
//         console.log(error);
//         return res.status(500).send({
//             status: "FAILURE",
//             error: error.message || "Internal server error",
//         });
//     }
// };


const createSubscriptionPayment = async (req, res) => {
    const userId = req.user._id;
    const { email, success_url, cancel_url, currency, duration, plan, planName, discount } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ status: "FAILURE", message: "User not found" });
        }

        // ---- Coupon Logic ----
        if (discount == 100) {
            // Check if user already has an active coupon
            if (user.subscription?.couponApplied) {
                return res.status(200).send({ status: "FAILURE", error: "Coupon already redeemed" });
            }

            // Set expiry to 3 months (90 days)
            const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

            // Create payment record with 1500+ credits
            const payment = new Payment({
                user: userId,
                amount: 0, // Free with coupon
                currency,
                status: 'Completed', // Set as completed immediately
                plan: planName,
                planType: "coupon",
                expiryDate,
                analyserTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                optimizerTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                jobCVTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                careerCounsellingTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                downloadCVTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                }
            });

            await payment.save();

            // Update user subscription with coupon benefits
            user.subscription = user.subscription || {};
            user.subscription.status = 'Completed';
            user.subscription.plan = [...(user.subscription.plan || []), planName];
            user.subscription.planType = "coupon";
            user.subscription.currentPeriodStart = new Date();
            user.subscription.currentPeriodEnd = expiryDate;
            user.subscription.paymentId = payment._id;

            // Set 1500+ credits for all token types
            user.subscription.analyserTokens = {
                credits: 1500,
                expiry: expiryDate
            };
            user.subscription.optimizerTokens = {
                credits: 1500,
                expiry: expiryDate
            };
            user.subscription.JobCVTokens = {
                credits: 1500,
                expiry: expiryDate
            };
            user.subscription.downloadCVTokens = {
                credits: 1500,
                expiry: expiryDate
            };
            user.subscription.careerCounsellingTokens = {
                credits: 1500,
                expiry: expiryDate
            };

            // Mark that user has redeemed a coupon
            user.subscription.couponApplied = true;
            user.subscription.couponExpiryDate = expiryDate;

            user.payments = [...(user.payments || []), payment._id];
            await user.save();

            return res.status(200).send({
                status: "SUCCESS",
                message: "Coupon applied successfully. You now have 3 months free access with 1500+ credits."
            });
        }

        // ---- Partial Discount Logic (>0% and <100%) ----
        if (discount && discount > 0 && discount < 100) {
            // Calculate discounted amount
            let amount, planDisplayName;

            if (plan) {
                const priceString = plan?.price?.[duration];
                if (!priceString) {
                    return res.status(400).send({ status: "FAILURE", message: "Invalid price information" });
                }

                amount = parseFloat(priceString.replace(/[^\d.]/g, ''));
                planDisplayName = plan?.name || "Subscription Plan";

                if (!amount || isNaN(amount)) {
                    return res.status(400).send({ status: "FAILURE", message: "Invalid pricing format" });
                }
            } else {
                const pricing = getPricing(currency, planName);
                amount = pricing?.price;
                planDisplayName = getPlanName(planName);
                if (!amount || !planDisplayName) {
                    return res.status(400).send({ status: "FAILURE", message: "Invalid plan details" });
                }

                // Adjust annual pricing if needed
                if (duration === 'yearly') {
                    amount *= 10;
                }
            }

            // Apply discount
            const discountedAmount = amount * (1 - discount / 100);

            // Set expiry to 3 months
            const expiryDate = new Date(new Date().setMonth(new Date().getMonth() + 3));

            // Create Stripe checkout session with discounted amount
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `${planDisplayName} - ${duration} (${discount}% off)`,
                        },
                        unit_amount: discountedAmount * 100,
                    },
                    quantity: 1,
                }],
                customer_email: email,
                success_url,
                cancel_url,
                metadata: {
                    discount: discount.toString(),
                    type: 'discountedPayment'
                }
            });

            // Create payment record with 1500+ credits
            const payment = new Payment({
                user: userId,
                amount: discountedAmount,
                status: 'Pending',
                currency,
                plan: planName,
                planType: "discounted",
                sessionId: session.id,
                expiryDate,
                discount,
                analyserTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                optimizerTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                jobCVTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                careerCounsellingTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                },
                downloadCVTokens: {
                    credits: 1500,
                    expiry: expiryDate,
                }
            });

            await payment.save();

            return res.status(200).send({
                url: session.url,
            });
        }

        // ---- Regular Paid Plan Logic (no discount) ----
        // [Rest of your existing code for regular plans...]
        let analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0, downloadCVTokens = 0;

        let amount, planDisplayName;

        if (plan) {
            // ✅ New Plan Flow (frontend-driven)
            const priceString = plan?.price?.[duration];
            if (!priceString) {
                return res.status(400).send({ status: "FAILURE", message: "Invalid price information" });
            }

            amount = parseFloat(priceString.replace(/[^\d.]/g, ''));
            planDisplayName = plan?.name || "Subscription Plan";

            if (!amount || isNaN(amount)) {
                return res.status(400).send({ status: "FAILURE", message: "Invalid pricing format" });
            }
        } else {
            // ✅ Fallback to Old Logic (backend pricing functions)
            const pricing = getPricing(currency, planName);
            amount = pricing?.price;
            planDisplayName = getPlanName(planName);
            if (!amount || !planDisplayName) {
                return res.status(400).send({ status: "FAILURE", message: "Invalid plan details" });
            }

            // Adjust annual pricing if needed
            if (duration === 'yearly') {
                amount *= 10;
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: currency.toLowerCase(),
                    product_data: {
                        name: `${planDisplayName} - ${duration}`,
                    },
                    unit_amount: amount * 100,
                },
                quantity: 1,
            }],
            customer_email: email,
            success_url,
            cancel_url,
        });

        // Calculate expiry date
        const currentPeriodEnd = duration === 'monthly'
            ? new Date(new Date().setMonth(new Date().getMonth() + 1))
            : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

        // Standard token allocation
        if (planName?.toLowerCase() === 'cvstudio') {
            analyserTokens = 20;
            optimizerTokens = 20;
            JobCVTokens = 20;
            downloadCVTokens = 20;
        } else if (planName?.toLowerCase() === 'aicareercoach') {
            careerCounsellingTokens = 1;
        } else if (planName?.toLowerCase() === 'basic') {
            analyserTokens = 50;
            optimizerTokens = 50;
            JobCVTokens = 50;
            downloadCVTokens = 50;
        } else if (planName?.toLowerCase() === 'lite') {
            analyserTokens = 200;
            optimizerTokens = 200;
            JobCVTokens = 200;
            downloadCVTokens = 200;
        } else if (planName?.toLowerCase() === 'premium') {
            analyserTokens = 500;
            optimizerTokens = 500;
            JobCVTokens = 500;
            downloadCVTokens = 500;
            careerCounsellingTokens = 500;
        }

        const payment = new Payment({
            user: userId,
            amount,
            status: 'Pending',
            currency,
            plan: planName,
            planType: duration,
            sessionId: session.id,
            analyserTokens: {
                credits: analyserTokens,
                expiry: currentPeriodEnd,
            },
            optimizerTokens: {
                credits: optimizerTokens,
                expiry: currentPeriodEnd,
            },
            jobCVTokens: {
                credits: JobCVTokens,
                expiry: currentPeriodEnd,
            },
            careerCounsellingTokens: {
                credits: careerCounsellingTokens,
                expiry: currentPeriodEnd,
            },
            downloadCVTokens: {
                credits: downloadCVTokens,
                expiry: currentPeriodEnd,
            },
            expiryDate: currentPeriodEnd,
        });

        await payment.save();

        return res.status(200).send({
            url: session.url,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            status: "FAILURE",
            error: error.message || "Internal server error",
        });
    }
};



const chargeDelayedPayment = async (paymentId) => {
    try {

        const payment = await Payment.findById(paymentId);

        if (!payment || payment.status !== 'Ready for Charge') {
            throw new Error("Payment not ready for charging or already processed.");
        }

        let setupIntent;
        try {
            setupIntent = await stripe.setupIntents.retrieve(payment.setupIntentId);
        } catch (error) {
            console.error(`Failed to retrieve setup intent: ${error.message}`);
            throw new Error("Failed to retrieve setup intent.");
        }

        if (!setupIntent || setupIntent.status !== 'succeeded') {
            throw new Error("Setup Intent not valid for charging.");
        }

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                amount: payment.amount * 100,
                currency: payment.currency || 'usd',
                customer: setupIntent.customer,
                payment_method: setupIntent.payment_method,
                off_session: true,
                confirm: true,
            });
        } catch (error) {
            console.error(`Failed to create payment intent: ${error.message}`);
            throw new Error("Failed to create payment intent.");
        }

        // Update payment status
        payment.status = 'Completed';
        payment.paymentIntentId = paymentIntent.id;
        payment.expiryDate = new Date(); // Update expiry or subscription details as needed
        await payment.save();

        console.log(`Payment ${paymentId} successfully charged.`);
        return { success: true, paymentIntent };
    } catch (error) {
        console.error(`Error in charging delayed payment ${paymentId}: ${error.message}`);
        return { success: false, error: error.message };
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
        case 'setup_intent.succeeded': {
            const setupIntent = event.data.object;

            try {
                const payment = await Payment.findOne({ setupIntentId: setupIntent.id });

                if (!payment) {
                    console.error(`Payment record not found for setupIntentId: ${setupIntent.id}`);
                    return reply.status(404).send('Payment record not found');
                }

                // payment.status = 'Ready for Charge';
                payment.status = 'Completed';
                await payment.save();
                const user = await payment.user;

                if (!user) {
                    throw new Error('User not found in payment.');
                }

                const userId = await User.findOne({ _id: user });
                if (!userId) {
                    throw new Error(`User with ID ${user} not found.`);
                }
                if (!userId.subscription) {
                    throw new Error(`Subscription data missing for user ${userId._id}`);
                }

                // userId.subscription.analyserTokens.credits = 20;
                // userId.subscription.optimizerTokens.credits = 20;
                // userId.subscription.JobCVTokens.credits = 20;
                // userId.subscription.downloadCVTokens.credits = 20;
                // userId.subscription.plan.push("Trial14");
                // userId.subscription.trial.status = "Active";
                // userId.subscription.trial.expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                user.subscription = user.subscription || {};
                user.subscription.status = 'Completed';
                user.subscription.plan = [...(user.subscription.plan || []), payment.plan];
                user.subscription.planType = payment.planType;
                user.subscription.currentPeriodStart = new Date();
                user.subscription.currentPeriodEnd = payment.expiryDate; // 3 months
                user.subscription.paymentId = payment._id;

                user.subscription.analyserTokens = {
                    credits: 1500,
                    expiry: payment.expiryDate
                };
                user.subscription.optimizerTokens = {
                    credits: 1500,
                    expiry: payment.expiryDate
                };
                user.subscription.JobCVTokens = {
                    credits: 1500,
                    expiry: payment.expiryDate
                };
                user.subscription.downloadCVTokens = {
                    credits: 1500,
                    expiry: payment.expiryDate
                };
                user.subscription.careerCounsellingTokens = {
                    credits: 1500,
                    expiry: payment.expiryDate
                };

                user.payments = [...(user.payments || []), payment._id];
                await user.save();
                return reply.status(200).send({ message: 'Discounted subscription payment completed successfully' });

                // console.log(`Payment setup succeeded for payment ID: ${payment._id}`);
            } catch (err) {
                console.error('Error processing setup_intent.succeeded event:', err);
                return reply.status(500).send('Internal server error');
            }
            break;
        }

        case 'setup_intent.setup_failed': {
            const setupIntent = event.data.object;

            try {
                const payment = await Payment.findOne({ setupIntentId: setupIntent.id });

                if (!payment) {
                    console.error(`Payment record not found for setupIntentId: ${setupIntent.id}`);
                    return reply.status(404).send('Payment record not found');
                }

                payment.status = 'Failed'; // Update status to Failed
                await payment.save();
                console.log(`Payment setup failed for payment ID: ${payment._id}`);
            } catch (err) {
                console.error('Error processing setup_intent.setup_failed event:', err);
                return reply.status(500).send('Internal server error');
            }
            break;
        }

        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            if (paymentIntent.metadata?.payment === 'delayedPayment') {
                try {
                    const payment = await Payment.findOne({ setupIntentId: paymentIntent.setup_intent });

                    if (!payment) {
                        console.error(`Payment record not found for setupIntentId: ${paymentIntent.setup_intent}`);
                        return reply.status(404).send('Payment record not found');
                    }

                    payment.status = 'Completed'; // Update payment status
                    await payment.save();

                    // Additional logic for subscription or user updates
                    const userId = payment.user;
                    const user = await User.findOne({ _id: userId });
                    if (!user) {
                        console.error('User not found for payment:', payment.user);
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
                            'subscription.stripeCheckoutSessionId': paymentIntent.id, // If still useful
                            'subscription.paymentId': payment._id,
                            'subscription.analyserTokens': payment.analyserTokens,
                            'subscription.optimizerTokens': payment.optimizerTokens,
                            'subscription.JobCVTokens': payment.jobCVTokens,
                            'subscription.careerCounsellingTokens': payment.careerCounsellingTokens,
                            'subscription.downloadCVTokens': payment.downloadCVTokens,
                            payments: [...user.payments, payment._id],
                        },
                    });

                    console.log(`Payment intent succeeded for setupIntentId: ${paymentIntent.setup_intent}`);
                    return reply.status(200).send({ message: 'Subscription payment completed successfully' });
                } catch (err) {
                    console.error('Error processing payment_intent.succeeded event:', err);
                    return reply.status(500).send('Internal server error');
                }
            }

        }


        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;

            try {
                const payment = await Payment.findOne({ setupIntentId: paymentIntent.setup_intent });

                if (!payment) {
                    console.error(`Payment record not found for setupIntentId: ${paymentIntent.setup_intent}`);
                    return reply.status(404).send('Payment record not found');
                }

                payment.status = 'Failed'; // Update payment status
                await payment.save();

                console.log(`Payment intent failed for setupIntentId: ${paymentIntent.setup_intent}`);
            } catch (err) {
                console.error('Error updating payment status to Failed:', err);
                return reply.status(500).send('Internal server error');
            }
            break;
        }

        case 'checkout.session.completed': {
            const session = event.data.object;

            try {
                // Check if session status is 'complete'
                if (session.status === 'complete') {
                    console.log('Session status is complete.');

                    // Check for metadata type
                    if (session.metadata?.type === 'coachPayment') {
                        console.log('Processing coach payment...');
                        try {
                            // Retrieve the coach payment record
                            const coachPayment = await CoachPayment.findOne({ sessionId: session.id });

                            if (coachPayment) {
                                // Update the coach payment status
                                coachPayment.status = 'Completed';
                                await coachPayment.save();
                                // console.log('Coach payment updated successfully:', coachPayment);

                                // Send success response
                                return reply.status(200).send({ message: 'Coach payment completed successfully' });
                            } else {
                                console.log('No coach payment found for session ID:', session.id);
                                return reply.status(404).send({ message: 'Coach payment record not found' });
                            }
                        } catch (error) {
                            console.error('Error processing coach payment:', error);
                            return reply.status(500).send({ message: 'Internal server error while processing coach payment' });
                        }
                    } else if (session.metadata?.type === 'slotBooking') {
                        console.log('Processing slot booking...');
                        // Add slot booking logic here
                    } else {
                        try {

                            const payment = await Payment.findOne({ sessionId: session.id });
                            if (!payment) {
                                console.error(`Payment record not found for sessionId: ${session.id}`);
                                return reply.status(404).send('Payment record not found');
                            }

                            payment.status = 'Completed'; // Update payment status
                            await payment.save();

                            // Additional logic for subscription or user updates
                            const user = await User.findOne({ _id: payment.user });
                            if (!user) {
                                console.error('User not found for payment:', payment.user);
                                return reply.status(404).send('User not found');
                            }

                            // Update user subscription
                            user.subscription.analyserTokens.credits = 20;
                            user.subscription.optimizerTokens.credits = 20;
                            user.subscription.JobCVTokens.credits = 20;
                            user.subscription.downloadCVTokens.credits = 20;
                            await user.save();


                            return reply.status(200).send({ message: 'Subscription payment completed successfully' });
                        } catch (err) {
                            console.error('Error processing payment_intent.succeeded event:', err);
                            return reply.status(500).send('Internal server error');
                        }
                    }
                } else {
                    console.warn(`Session status is not complete: ${session.status}`);
                    return reply.status(400).send({ message: `Invalid session status: ${session.status}` });
                }
            } catch (err) {
                console.error('Error handling checkout.session.completed event:', err);
                return reply.status(500).send({ message: 'Internal server error' });
            }

            break;
        }


        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    reply.status(200).send();
};

const razorpayWebhook = async (request, reply) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const invoiceTemplatePath = path.join(__dirname, '..', "emailTemplates", 'InvoiceTemplate.html');
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(request.body));
    const digest = shasum.digest('hex');

    if (digest !== request.headers['x-razorpay-signature']) {
        console.error('Invalid signature');
        return reply.code(400).send({ message: 'Invalid signature' });
    }

    const event = request.body.event;
    const payload = request.body.payload;
    if (event == 'order.paid') {
        const order = payload.order.entity;
        if (order.status == 'paid') {
            try {
                const payment = await Payment.findOne({ sessionId: order.id });
                if (!payment) {
                    console.error(`Payment record not found for order ID: ${order.id}`);
                    return reply.status(404).send('Payment record not found');
                }

                payment.status = 'Completed';
                await payment.save();
                const user = await User.findById(payment.user);
                if (!user) {
                    console.error(`User not found for ID: ${payment.user}`);
                    return reply.status(404).send('User not found');
                }
                user.subscription.status = 'Completed';
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
    const coach = await Coach.findById(coachId);
    if (!coach) {
        return reply.status(404).send('Coach not found');
    }
    if (
        coach.availability &&
        Array.isArray(coach.availability.dates) &&
        coach.availability.dates.every(day => day.isAvailable === false)
    ) {
        return reply.status(200).send({
            status: "FAILURE",
            message: "Coach is not available all slots are booked for the month."
        });
    } else {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency,
                        unit_amount: amount * 100,
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
            return reply.status(201).send({ url: session.url });
        } catch (error) {
            console.log("Error processing coach payment", error);
            return reply.status(500).send('Error processing payment');
        }
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
    bookCoachSlot,
};