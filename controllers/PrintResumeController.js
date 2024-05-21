const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const printResumePath = path.join(__dirname, '..', 'resumeTemplate/resume.html');

const printResume = async (request, reply) => {
    const htmlbody = request.body.html;
    const pageContent = fs.readFileSync(printResumePath, 'utf8').toString();
    const html = pageContent.replace('{{content}}', htmlbody);
    console.log(html);

    try {
        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        
        // Add a page to the PDF document
        const page = pdfDoc.addPage([600, 800]);
        
        // Draw the HTML content as text (basic example)
        page.drawText(html, {
            x: 50,
            y: 750,
            size: 12,
            color: rgb(0, 0, 0),
        });

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();

        // Send the PDF as response
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', 'attachment; filename="generated.pdf"');
        reply.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error generating PDF:', error);
        reply.status(500).send('Error generating PDF');
    }
};

module.exports = { printResume };
