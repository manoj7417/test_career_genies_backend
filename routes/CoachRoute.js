
const { registerCoach, coachLogin, setCoachAvailability, getAllCoaches, getCoachDetails, updateCoachDetails, forgotCoachPassword, resetCoachPassword, uploadCoachDocuments, authVerification, getBookings, createProgram, getAllPrograms, getCoachPrograms, updateProgram, deleteProgram, getCoachProgramById, editProgramByadmin, getCoachProgramByprogramId } = require("../controllers/CoachController");


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

    fastify.get("/programs", getAllPrograms)  //use this one to get all program details for admin dashboards

    fastify.get("/programByCoachId", { preHandler: fastify.coachAuth }, getCoachPrograms)

    fastify.get("/programByCoachId/:coachId", getCoachProgramById)

    fastify.get("/programByProgramId/:programId", { preHandler: fastify.coachAuth }, getCoachProgramByprogramId)

    fastify.put("/editProgram", { preHandler: fastify.coachAuth }, updateProgram)

    fastify.put("/editProgramByAdmin/:programId", editProgramByadmin) // use this one to approve the program

    fastify.delete("/deleteProgram/:programId", { preHandler: fastify.coachAuth }, deleteProgram)


}

module.exports = CoachRoute;