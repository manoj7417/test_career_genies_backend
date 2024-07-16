const { register, login, forgetPassword, resetPassword, updateUserDetails, getAllUsers, logout, templatepurchase, analyserCreditsPurchase, UploadProfilePic, updateUserProfileDetails, checkUserTemplate, GetuserDetails, careerCounsellingEligibility, changePassword } = require("../controllers/UserController");
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

    fastify.post('/update/userdetails', { preHandler: fastify.verifyJWT }, updateUserDetails)
    fastify.patch('/update/userprofiledetails', { preHandler: fastify.verifyJWT }, updateUserProfileDetails)
    fastify.get('/getUserProfile', { preHandler: fastify.verifyJWT }, GetuserDetails)

    fastify.get('/eligiblity/careerCounselling', {
        preHandler: fastify.verifyJWT
    }, careerCounsellingEligibility)

    fastify.post('/changepassword', {
        preHandler: fastify.verifyJWT
    }, changePassword)
}

module.exports = UserRoute