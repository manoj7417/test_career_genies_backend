
const nodemailer = require('nodemailer')
const useremail = process.env.EMAIL_USER
const password = process.env.EMAIL_APP_PASSWORD
const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT
const smtpFrom = process.env.SMTP_FROM

// Debug: Check if environment variables are loaded
console.log('Email Config Debug:', {
    useremail: useremail ? 'Set' : 'Not Set',
    password: password ? 'Set' : 'Not Set',
    smtpHost: smtpHost || 'Not Set',
    smtpPort: smtpPort || 'Not Set',
    smtpFrom: smtpFrom || 'Not Set'
})

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: true, // true for 465, false for other ports
    auth: {
        user: useremail,
        pass: password,
    }
})

// Debug: Log the actual configuration being used
console.log('Transporter Config:', {
    host: smtpHost,
    port: smtpPort,
    secure: true,
    auth: {
        user: useremail,
        pass: password ? '***hidden***' : 'Not Set'
    }
})

function sendEmail(toEmail, subject, html) {
    const mailOptions = {
        from: smtpFrom,
        to: toEmail,
        subject: subject,
        html: html,
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                reject(error);
            } else {
                console.log('Email sent:', info.response);
                resolve(info);
            }
        });
    });
}

module.exports = { sendEmail };