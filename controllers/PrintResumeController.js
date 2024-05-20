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
    const cachePath = '.cache/puppeteer';
    const possiblePaths = [
      path.join(cachePath, 'chrome', 'linux-124.0.6367.207', 'chrome-linux64', 'chrome'),
      path.join(cachePath, 'chrome', 'latest', 'chrome-linux', 'chrome')
    ];

    let chromePath;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        chromePath = p;
        break;
      }
    }

    if (!chromePath) {
      throw new Error(`Chrome executable not found in any of the paths: ${possiblePaths.join(', ')}`);
    }

    console.log('Chrome Executable Path:', chromePath);

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
