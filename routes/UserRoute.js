const { register, login, forgetPassword, resetPassword, updateUserDetails, getAllUsers, logout } = require("../controllers/UserController");

const registerSchema = {
    body: {
        type: 'object',
        required: ['fullname', 'email', 'password'],
        properties: {
            fullname: { type: 'string', maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 100 }
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


    // verfiy user password and send access token in cookies
    fastify.post("/login", { schema: loginSchema }, login)


    // generate token for the user and email the user  the frontend link with token to reset the password 
    fastify.post("/forgetPassword", { schema: forgetPasswordSchema }, forgetPassword)


    //decode user token from response token and update the user password accordingly
    fastify.post("/resetPassword", { schema: resetPasswordSchema }, resetPassword)


    // update the user role and subsription status  for the specific user 
    fastify.route({
        method: 'patch',
        url: "/updateRole/:userId",
        preHandler: [fastify.verifyJWT, fastify.roleCheck(['admin'])],
        handler: updateUserDetails
    })

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
}

module.exports = UserRoute