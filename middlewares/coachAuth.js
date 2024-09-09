const jwt = require('jsonwebtoken')
const { Coach } = require('../models/CoachModel')

require('dotenv').config()

async function coachAuth(request, reply) {
    const token = request.headers?.authorization?.split(" ")[1]
    try {
        if (!token) {
            return reply.code(401).send({
                status: "FAILURE",
                error: "Auth token is required"
            })
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const coach = await Coach.findById(decodedToken?._id).select("-password")
        if (!coach) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            })
        }
        request.coach = coach;
    } catch (error) {
        return reply.code(401).send({
            status: "FAILURE",
            error: "Unauthorized"
        })
    }
}

module.exports = coachAuth