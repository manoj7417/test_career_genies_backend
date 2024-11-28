const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const getGoogleAuthURL = (isSignup = false) => {
    const scopes = [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
    ];

    // Add Google Calendar scope for signup
    if (isSignup) {
        scopes.push("https://www.googleapis.com/auth/calendar");
    }

    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: isSignup ? "consent" : "none",
        scope: scopes,
    });
};

const getGoogleUser = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();
    return { userInfo: userInfo.data, tokens };
};

module.exports = { getGoogleAuthURL, getGoogleUser, oauth2Client };
