const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer')

const printResumePath = path.join(
    __dirname,
    '..',
    'resumeTemplate/resume.html')

const printResume = async (request, reply) => {
    const htmlbody = request.body.html;
    const page = fs.readFileSync(printResumePath, 'utf8').toString()
    const html = page.replace('{{content}}', htmlbody);
    try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--single-process',
                "--no-zygote",
            ],
            executablePath:  '/usr/bin/google-chrome-stable',
        });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });
        await browser.close();
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', 'attachment; filename="generated.pdf"');
        reply.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        reply.status(500).send('Error generating PDF');
    }

}

module.exports = { printResume }