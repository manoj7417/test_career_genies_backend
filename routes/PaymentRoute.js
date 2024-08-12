const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Payment } = require("../models/PaymentModel");

const razorpay = new Razorpay({
    key_id: 'rzp_live_RhRPNiv9OEVxtr',
    key_secret: 'Xu0pwpXUXMqbBFK4cJPlFdbZ'
});

async function PaymentRoute(fastify, options) {
   
    fastify.post("/upgradePlan", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        
        const { plan, duration } = request.body;
        const userId = request.user.id;
        let amount, analyserTokens = 0, optimizerTokens = 0, JobCVTokens = 0, careerCounsellingTokens = 0;
        let currentPeriodEnd;
      
        switch (plan) {
            case 'free':
                amount = 0;
                break;
            case 'basic':
                amount = duration === 'monthly' ? 449 : 4999;
                analyserTokens = duration === 'monthly' ? 10 : 10 * 12;
                optimizerTokens = duration === 'monthly' ? 10 : 10 * 12;
                JobCVTokens = duration === 'monthly' ? 10 : 10 * 12;
                careerCounsellingTokens = duration === 'monthly' ? 10 : 10 * 12; // Example value
                currentPeriodEnd = duration === 'monthly' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
                break;
            case 'premium':
                amount = duration === 'monthly' ? 999 : 9999;
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

        const orderOptions = {
            amount: amount * 100, 
            currency: "INR",
            receipt: `receipt_order_${userId}`,
            payment_capture: 1 // auto capture
        };



        try {
            const order = await razorpay.orders.create(orderOptions);
            console.log('Order created:', order);

            const payment = new Payment({
                user: userId,
                amount: amount,
                status: 'Pending',
                plan: plan,
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
