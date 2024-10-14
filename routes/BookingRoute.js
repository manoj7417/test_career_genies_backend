const { bookSlots } = require("../controllers/BookingController");



async function BookingRoute(fastify, options) {
    fastify.post('/bookSlot', { preHandler: fastify.verifyJWT }, bookSlots)

}

module.exports = BookingRoute;