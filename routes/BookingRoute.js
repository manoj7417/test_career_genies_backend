const { BookSlot } = require("../controllers/BookingController");


async function BookingRoute(fastify, options) {

    fastify.get('/book/:coachId', { preHandler: fastify.verifyJWT }, BookSlot)

    
}

module.exports = BookingRoute; 