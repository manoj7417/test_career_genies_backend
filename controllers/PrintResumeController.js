const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf-node');

const printResumePath = path.join(__dirname, '..', 'resumeTemplate/resume.html');

const printResume = async (request, reply) => {
    const htmlbody = request.body.html;
    const pageContent = fs.readFileSync(printResumePath, 'utf8').toString();
    const html = pageContent.replace('{{content}}', htmlbody);
    console.log(html);

    const options = { format: 'A4' };
    const file = { content: html };

    try {
        const pdfBuffer = await pdf.generatePdf(file, options);
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', 'attachment; filename="generated.pdf"');
        reply.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        reply.status(500).send('Error generating PDF');
    }
};

module.exports = { printResume };
