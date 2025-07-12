const axios = require('axios');
const { rgbToXyFromHex } = require('./rgbtoxy');
const { getAccessToken, getApplicationKey, refreshTokensAndAppKey } = require('./huetoken');
const { berechneLampenHelligkeit } = require('./brightness');

async function getLights(access_token, applicationKey) {
    if (!access_token || !applicationKey) {
        throw new Error('Kein Access Token oder Application Key. Bitte zuerst /auth aufrufen.');
    }

    const resources = await axios.get('https://api.meethue.com/route/clip/v2/resource/light', {
        headers: {
            Authorization: `Bearer ${access_token}`,
            'hue-application-key': applicationKey
        }
    });

    if (!resources.data.data || resources.data.data.length === 0) {
        throw new Error('Keine Lampen gefunden.');
    }

    return resources.data.data;
}

function getLightIdByName(lights, lightName) {
    const light = lights.find(l => l.metadata && l.metadata.name === lightName);
    if (!light) {
        throw new Error(`Lampe "${lightName}" nicht gefunden.`);
    }
    return light.id;
}

async function getKeys() {
    // try to load access token and application key directly
    const applicationKey = await getApplicationKey();
    const access_token = await getAccessToken();
    if (!access_token || !applicationKey) {
        throw new Error('Access Token oder Application Key konnte nicht geladen werden.');
    }
    return { access_token, applicationKey };
}

async function steuereLampe(lightId, on, brightness, rgb, access_token, applicationKey) {
    console.log(`Steuere Lampe: ${on ? 'An' : 'Aus'}, Helligkeit: ${brightness}, Farbe: ${rgb}`);
    const colorXY = rgbToXyFromHex(rgb);

    // Lampe anschalten
    await axios.put(
        `https://api.meethue.com/route/clip/v2/resource/light/${lightId}`,
        {
            "on": { "on": on },
            "dimming": { "brightness": brightness },
            "color": { "xy": { "x": colorXY[0], "y": colorXY[1] } }
        },
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'hue-application-key': applicationKey,
                'Content-Type': 'application/json'
            }
        }
    );
}

async function handleLight() {
    const { access_token, applicationKey } = await getKeys();

    // Lampe abfragen
    const lights = await getLights(access_token, applicationKey);
    const lightId = getLightIdByName(lights, process.env.HUE_LIGHT_NAME);
    console.log(`Steuere Lampe: ${lightId} mit Namen ${process.env.HUE_LIGHT_NAME}`);

    // Status abrufen
    const statusURL = process.env.STATUS_API_URL + "/status";
    console.log("Abfrage des Status von:", statusURL);
    const statusResponse = await axios.get(statusURL);
    console.log("Abgerufener Status:", statusResponse.data.status);

    // Pruefe, ob der Default Status aktiv ist
    const on = !statusResponse.data.default;
    if (!on) {
        await steuereLampe(lightId, false, 0, "#000000", access_token, applicationKey);
    } else {
        const brightness = await berechneLampenHelligkeit();
        await steuereLampe(lightId, on, brightness, statusResponse.data.color, access_token, applicationKey);
    }

    console.log("Lampe erfolgreich gesteuert.");
};

module.exports = { handleLight };