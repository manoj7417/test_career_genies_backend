const { register, login, forgetPassword, resetPassword,  getAllUsers, logout, templatepurchase, analyserCreditsPurchase, UploadProfilePic, updateUserProfileDetails, GetuserDetails, careerCounsellingEligibility, changePassword, verifyToken, verifyEmail, resendVerificationEmail, udpateProfileImage, getUserBookingsDetails, scheduleProgram, scheduleProgramDay, getEnrollmentDetails, getAllEnrollmentDetailsofUser, updateScheduleProgramDay } = require("../controllers/UserController");
const upload = require('../config/multer')


const registerSchema = {
    body: {
        type: 'object',
        required: ['fullname', 'email'],
        properties: {
            fullname: { type: 'string', maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 }
        }
    }
};

const loginSchema = {
    body: {
        type: "object",
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: "email", maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 100 }
        }
    }
}

const forgetPasswordSchema = {
    body: {
        type: "object",
        required: ['email'],
        properties: {
            email: { type: 'string', format: "email", maxLength: 255 }
        }
    }
}

const resetPasswordSchema = {
    body: {
        type: "object",
        required: ['newPassword', 'token'],
        properties: {
            token: { type: 'string', maxLength: 500 },
            newPassword: { type: 'string', minLength: 8, maxLength: 100 }
        }
    }
}


async function UserRoute(fastify, options) {
    // register the user 
    fastify.post("/register", { schema: registerSchema }, register)

    fastify.post("/templatepurchase", templatepurchase)

    fastify.post("/creditsPurchase", { preHandler: fastify.verifyJWT }, analyserCreditsPurchase)

    fastify.post("/upload/profile", { preHandler: [fastify.verifyJWT, upload.single('file')] }, UploadProfilePic)
    // verfiy user password and send access token in cookies
    fastify.post("/login", { schema: loginSchema }, login)
    // generate token for the user and email the user  the frontend link with token to reset the password 
    fastify.post("/forgetPassword", { schema: forgetPasswordSchema }, forgetPassword)


    //decode user token from response token and update the user password accordingly
    fastify.post("/resetPassword", { schema: resetPasswordSchema }, resetPassword)

    // update the user role and subsription status  for the specific user 
    fastify.route({
        method: "GET",
        url: "/all",
        preHandler: [fastify.verifyJWT, fastify.roleCheck(['admin'])],
        handler: getAllUsers

    })

    fastify.route({
        method: "GET",
        url: "/logout",
        handler: logout
    })


    fastify.patch('/update/userprofiledetails', { preHandler: fastify.verifyJWT }, updateUserProfileDetails)

    fastify.patch("/udpate/profilImage", { preHandler: fastify.verifyJWT }, udpateProfileImage)

    fastify.get('/getUserProfile', { preHandler: fastify.verifyJWT }, GetuserDetails)

    fastify.get('/eligiblity/careerCounselling', {
        preHandler: fastify.verifyJWT
    }, careerCounsellingEligibility)

    fastify.post('/changepassword', {
        preHandler: fastify.verifyJWT
    }, changePassword)

    fastify.post('/verify-token', verifyToken)

    fastify.post('/verify-email', verifyEmail)

    fastify.post('/resend-verificationEmail', resendVerificationEmail)

    fastify.get('/bookings', { preHandler: fastify.verifyJWT }, getUserBookingsDetails)

    fastify.post('/scheduleProgram', { preHandler: fastify.verifyJWT }, scheduleProgram)

    fastify.post('/scheduleProgramDay', {preHandler: fastify.verifyJWT},  scheduleProgramDay)

    fastify.put('/updateScheduleProgramDay', { preHandler: fastify.verifyJWT }, updateScheduleProgramDay)

    fastify.get('/getEnrollmentDetails/:programId', { preHandler: fastify.verifyJWT }, getEnrollmentDetails)
    
    fastify.get('/getAllEnrollmentDetails',{ preHandler: fastify.verifyJWT}, getAllEnrollmentDetailsofUser)
}

module.exports = UserRoute