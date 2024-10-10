
const { registerCoach, coachLogin, setCoachAvailability, getAllCoaches, getCoachDetails, updateCoachDetails, forgotCoachPassword, resetCoachPassword, uploadCoachDocuments, authVerification, getBookings, createProgram, getAllPrograms, getCoachPrograms, updateProgram, deleteProgram } = require("../controllers/CoachController");


async function CoachRoute(fastify, options) {
    fastify.post('/register', registerCoach)

    fastify.post('/login', coachLogin)

    fastify.post("/auth", authVerification)

    fastify.patch("/add-documents", { preHandler: fastify.coachAuth }, uploadCoachDocuments)

    fastify.patch("/set-availability", {
        preHandler: fastify.coachAuth,
    }, setCoachAvailability)


    fastify.get('/all', getAllCoaches)

    fastify.get('/getcoachbyId/:coachId', getCoachDetails)

    fastify.patch("/update", {
        preHandler: fastify.coachAuth,
    }, updateCoachDetails)

    fastify.post("/forgot-password", forgotCoachPassword)

    fastify.post("/reset-password", resetCoachPassword)

    fastify.get("/bookings", { preHandler: fastify.coachAuth }, getBookings)

    fastify.post("/create-program", { preHandler: fastify.coachAuth }, createProgram)

    fastify.get("/programs", getAllPrograms)

    fastify.get("/programByCoachId",{ preHandler: fastify.coachAuth }, getCoachPrograms)

    fastify.put("/editProgram",{ preHandler: fastify.coachAuth }, updateProgram)

    fastify.delete("/deleteProgram",{ preHandler: fastify.coachAuth }, deleteProgram)

    
}

module.exports = CoachRoute;