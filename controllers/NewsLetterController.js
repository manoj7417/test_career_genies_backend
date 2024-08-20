const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/nodemailer');
const newsLetterpath = path.join(
    __dirname,
    "..",
    "emailTemplates",
    "newsletter.html"
);
require('dotenv').config();
const USER_EMAIL = process.env.USER_EMAIL


const subscribeNewsletter = async (req, res) => {
    const { email } = req.body;
    try {
        const newsletterhtml = fs.readFileSync(newsLetterpath, 'utf8');
        const emailBody = newsletterhtml.replace("{email}", email)
        await sendEmail(USER_EMAIL, "Subscription for newsletter", emailBody)
        res.status(200).send({
            status: "SUCCESS",
            message: "Newsletter subscription successful",
        });
    } catch (error) {
        console.error("Error subscribing to newsletter:", error);
        res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while subscribing to newsletter",
        });
    }
}

module.exports = {
    subscribeNewsletter,
};
