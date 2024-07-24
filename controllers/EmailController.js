const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/nodemailer");
const messagePath = path.join(__dirname, '..', 'emailTemplates', 'messageTemplate.html')

const sendMessage = async (req, reply) => {
    const body = req.body.message;
    try {
        const email = 'amit.bajaj@careergenies.co.uk'
        const messageTemplate = fs.readFileSync(messagePath, 'utf8')

        const filledTemplate = messageTemplate
            .replace('{firstName}', body.firstName)
            .replace('{lastName}', body.lastName)
            .replace('{email}', body.email)
            .replace('{phone}', body.phone)
            .replace('{message}', body.message);
        await sendEmail(email, `Message received from ${body.email} in Genie's Career Hub`, filledTemplate)
        reply.status(201).send({
            status: 'SUCCESS',
            message: 'Message sent successfully'
        })
    } catch (error) {
        console.error('Error sending message:', error)
        reply.status(500).send({
            status: 'FAILURE',
            error: error.message || 'Internal server error'
        })
    }
}


module.exports = {
    sendMessage
}