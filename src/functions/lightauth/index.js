const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const { loadApplicationKey, saveRefreshToken } = require('../../huetoken');
const serverless = require('serverless-http');

const CLIENT_ID = process.env.HUE_CLIENT_ID;
const CLIENT_SECRET = process.env.HUE_CLIENT_SECRET;
const REDIRECT_URI = process.env.LIGHT_API_URL + "/lightauth/callback";

const app = express();

// Schritt 1: Benutzer autorisieren
app.get('/', (req, res) => {
    console.log("Redirect URL:", REDIRECT_URI);
    const url = `https://api.meethue.com/v2/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=remote_control&state=foobar`;
    console.log("Redirecting to:", url);
    res.redirect(url);
});


// Schritt 2: Callback mit Authorization Code
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post(
            'https://api.meethue.com/v2/oauth2/token',
            qs.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            {
                auth: {
                    username: CLIENT_ID,
                    password: CLIENT_SECRET
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;
        await saveRefreshToken(refresh_token);

        await loadApplicationKey(access_token, refresh_token);
        res.send('Token, Linkbutton gesetzt und Application Key erhalten.');
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send('Fehler beim Token-Austausch.');
    }
});

const handler = serverless(app);

module.exports = async function (context, req) {
    context.res = await handler(req, context);
};