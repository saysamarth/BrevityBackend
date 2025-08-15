const passport = require('passport');
const User = require('../models/user');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth2 Client for Android
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });

        const payload = ticket.getPayload();
        return {
            googleId: payload['sub'],
            email: payload['email'],
            name: payload['name'],
            picture: payload['picture'],
            emailVerified: payload['email_verified']
        };
    } catch (error) {
        throw new Error('Invalid Google token');
    }
}

// Keep the serialize/deserialize functions for session management if needed
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = { verifyGoogleToken };