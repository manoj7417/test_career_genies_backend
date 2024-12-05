const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { SpacesServiceClient } = require('@google-apps/meet').v2;
const { auth } = require('google-auth-library');


const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'];

const TOKEN_PATH = path.join(__dirname,'..', 'google.credentials', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname,'..', 'google.credentials', 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return auth.fromJSON(credentials);
    } catch (err) {
        console.log("No saved credentials found, proceeding with OAuth flow.");
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
 async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Creates a new meeting space.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
 async function createSpace(authClient , coachEmail) {
    const meetClient = new SpacesServiceClient({
        authClient: authClient
    });
    const request = {
        organizer: { email: coachEmail }, 
    };

    const response = await meetClient.createSpace(request);
    return response[0].meetingUri
}




module.exports = { authorize, createSpace };