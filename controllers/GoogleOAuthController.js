const { Coach } = require("../models/CoachModel");
const { User } = require("../models/userModel");
const { getGoogleAuthURL, getGoogleUser } = require("../utils/googleAuth");

const GoogleSignUp = async (req, res) => {
    const url = getGoogleAuthURL(true);
    res.status(200).send({ redirectUrl: url });
}

const GoogleCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send({ error: "No code provided" });
    }
    try {
        const googleUser = await getGoogleUser(code);

        if (!googleUser.userInfo.email) {
            return res.status(400).send({ error: "Google account has no email" });
        }
        console.log(googleUser)
        let coach = await Coach.findOne({ "googleAuth.googleId": googleUser.userInfo.id });
        if (!coach) {
            coach = new Coach({
                name: googleUser.userInfo.name,
                email: googleUser.userInfo.email,
                googleAuth: {
                    googleId: googleUser.userInfo.id,
                    isAuthorized: true,
                    accessToken: googleUser.tokens.access_token,
                    refreshToken: googleUser.tokens.refresh_token,
                    tokenExpiry: googleUser.tokens.expiry_date
                },
                profileImage: googleUser.userInfo.picture,
                emailVerified: true,
            });
            await coach.save();
            // return res.redirect("https://www.geniescareerhub.com/coach-signin")
            return res.redirect("http://localhost:3000/coach-signin")
        }

        const accessToken = coach.generateAccessToken();
        const refreshToken = coach.generateRefreshToken();

        res.send({
            message: "Login successful",
            coach: coach.toSafeObject(),
            tokens: { accessToken, refreshToken },
        });
    } catch (error) {
        console.error("Error during Google OAuth callback:", error);
        res.status(500).send({ error: "Internal server error" });
    }
}


module.exports = {
    GoogleSignUp,
    GoogleCallback
}