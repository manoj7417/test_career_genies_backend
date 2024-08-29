const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { User } = require('../models/userModel');

const printResumePath = path.join(
    __dirname,
    '..',
    'resumeTemplate/resume.html'
);

const printResume = async (request, reply) => {
    const userId = request.user._id;
    try {
        const user = await User.findById(userId);
        const currentDate = new Date();
        if (!user) {
            return reply.code(404).send({ status: 'FAILURE', message: 'User not found' });
        }


        if (user.subscription.downloadCVTokens.expiry <= currentDate) {
            return reply.code(403).send({
                status: 'FAILURE',
                message: 'Your download CV tokens have expired'
            });
        }
        if (user.subscription.downloadCVTokens.credits <= 0) {
            return reply.code(403).send({ status: 'FAILURE', message: 'You have no download CV tokens' });
        }
        const htmlbody = request.body.html;
        const htmlPage = fs.readFileSync(printResumePath, 'utf8').toString();
        const html = htmlPage.replace('{{content}}', htmlbody);
        const styledHtml = `     
            <style>
            @page :first{
                size: A4;
                margin-top: 0;
                margin-bottom: 10mm;
              }
              @page{
                margin-top: 10mm;
                margin-bottom: 10mm;
              }
        </style>
                ${html}
            `;
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                "--no-zygote",
            ],
            executablePath: '/usr/bin/google-chrome-stable',
        });
        const page = await browser.newPage();
        await page.setContent(styledHtml);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });
        await browser.close();
        user.subscription.downloadCVTokens.credits -= 1;
        await user.save();
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', 'attachment; filename="generated.pdf"');
        return reply.status(200).send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        reply.status(500).send('Error generating PDF');
    }
}

module.exports = { printResume };
