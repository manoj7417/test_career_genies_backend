const jwt = require('jsonwebtoken')
const { User } = require('../models/userModel')

require('dotenv').config()

async function verifyJWT(request, reply) {
    const token = request.cookies?.accessToken
    // request.headers?.authorization?.split(" ")[1]
    try {
        if (!token) {
            return reply.code(401).send({
                status: "FAILURE",
                error: "Auth token is required"
            })
        }

        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            })
        }
        request.user = user;
    } catch (error) {
        return reply.code(401).send({
            status: "FAILURE",
            error: "Unauthorized"
        })
    }
}

module.exports = verifyJWT