const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const printResumePath = path.join(__dirname, '..', 'resumeTemplate', 'resume.html');

const printResume = async (request, reply) => {
  const htmlbody = request.body.html;
  const pageTemplate = fs.readFileSync(printResumePath, 'utf8').toString();
  const html = pageTemplate.replace('{{content}}', htmlbody);
  console.log(html);

  try {
    const chromePath = '/home/apps/.cache/puppeteer/chrome/linux-124.0.6367.207/chrome-linux64/chrome';
    console.log('Chrome Executable Path:', chromePath);

    if (!fs.existsSync(chromePath)) {
      throw new Error(`Chrome executable not found at ${chromePath}`);
    }

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
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
};

module.exports = { printResume };
