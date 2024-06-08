FROM ghcr.io/puppeteer/puppeteer:22.8.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Switch to root user to set permissions
USER root

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Create and set permissions for the uploads directory
RUN mkdir -p /usr/src/app/uploads \
    && chmod -R 755 /usr/src/app/uploads \
    && chown -R pptruser:pptruser /usr/src/app/uploads

# Switch back to pptruser
USER pptruser

# Start the application
CMD ["node", "index.js"]
