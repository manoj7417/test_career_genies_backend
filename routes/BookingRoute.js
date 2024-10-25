const { bookSlots, getCoachBookedSlots } = require("../controllers/BookingController");



async function BookingRoute(fastify, options) {
    fastify.post('/bookSlot', { preHandler: fastify.verifyJWT }, bookSlots)

    fastify.get("/all", getCoachBookedSlots)

}

module.exports = BookingRoute;