const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const printResumePath = path.join(
    __dirname,
    '..',
    'resumeTemplate/resume.html'
);

const printResume = async (request, reply) => {
    const htmlbody = request.body.html;
    const pageTemplate = fs.readFileSync(printResumePath, 'utf8').toString();
    const html = pageTemplate.replace('{{content}}', htmlbody);

    // Add CSS for page-specific margins
    const styledHtml = `     
        <style>
            @page {
                size: A4;
                margin-bottom: 10mm; /* Bottom margin for all pages */
            }
            @media print {
                .page-break {
                    display: block;
                    page-break-before: always;
                    margin-top: 10mm; /* Top margin for all pages except the first */
                }
            }
        </style>
        ${html}
    `;

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
        await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

        // Inject JavaScript to add page breaks for all sections except the first
        await page.evaluate(() => {
            const elements = document.querySelectorAll('div'); // Select elements to break pages on
            elements.forEach((el, index) => {
                if (index !== 0) {
                    el.classList.add('page-break');
                }
            });
        });

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
};

module.exports = { printResume };
