const { execSync } = require('child_process');
const chromium = require('chrome-aws-lambda');

async function installChromium() {
  try {
    execSync('node node_modules/puppeteer-core/install.js');
    console.log('Chromium installed successfully');
  } catch (error) {
    console.error('Failed to install Chromium:', error);
  }
}

installChromium();
