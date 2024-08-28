const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Payment } = require("../models/PaymentModel");
const { getPricing } = require('../controllers/stripeController');


const razorpay = new Razorpay({
    key_id: 'rzp_live_RhRPNiv9OEVxtr',
    key_secret: 'Xu0pwpXUXMqbBFK4cJPlFdbZ'
});

async function PaymentRoute(fastify, options) {

    fastify.post("/upgradePlan", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { planName, duration } = request.body;
        const userId = request.user.id;
        let  analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0;
        const amount = getPricing(currency, planName)
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

        const orderOptions = {
            amount: amount ,
            currency: "INR",
            receipt: `receipt_order_${userId}`,
            payment_capture: 1
        };

        try {
            const order = await razorpay.orders.create(orderOptions);
            const payment = new Payment({
                user: userId,
                amount: amount,
                status: 'Pending',
                plan: planName,
                planType: duration,
                sessionId: order.id,
                analyserTokens: analyserTokens,
                optimizerTokens: optimizerTokens,
                jobCVTokens: JobCVTokens,
                careerCounsellingTokens: careerCounsellingTokens,
                expiryDate: currentPeriodEnd
            });

            await payment.save();
            // Save the order details to your database if necessary

            return reply.code(200).send({
                message: "success",
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: razorpay.key_id
            });

        } catch (error) {
            console.error('Error creating order:', error);
            return reply.code(500).send({ message: "Failed to create order" });
        }
    });


}


module.exports = PaymentRoute;
