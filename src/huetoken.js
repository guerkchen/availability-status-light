const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const { TableClient } = require('@azure/data-tables');


const CLIENT_ID = process.env.HUE_CLIENT_ID;
const CLIENT_SECRET = process.env.HUE_CLIENT_SECRET;

const TABLE_NAME = process.env.HUE_TABLE_NAME;
const PARTITION_KEY = process.env.HUE_PARTITION_KEY;
const ROW_KEY = process.env.HUE_ROW_KEY;
const connectionString = process.env.TableStorageConnectionString;

let applicationKey = null; // hue-application-key (Bridge-Token)
let access_token = null;
let refresh_token = null;

const app = express();

// Azure Table Helper
async function saveRefreshToken(token) {
    const client = TableClient.fromConnectionString(connectionString, TABLE_NAME);
    try { await client.createTable(); } catch (e) { }
    await client.upsertEntity({
        partitionKey: PARTITION_KEY,
        rowKey: ROW_KEY,
        refresh_token: token
    }, "Replace");
}

async function loadRefreshToken() {
    try {
        const client = TableClient.fromConnectionString(connectionString, TABLE_NAME);
        const entity = await client.getEntity(PARTITION_KEY, ROW_KEY);
        if (!entity.refresh_token) {
            throw new Error("Refresh Token nicht in Datenbank gesetzt. Bitte zuerst /auth aufrufen.");
        }
        refresh_token = entity.refresh_token;
        console.log("Refresh Token geladen");
    } catch (e) {
        throw new Error("Fehler beim Abrufen des Refresh Token. Bitte zuerst /auth aufrufen.");
    }
}

async function getAccessToken() {
    if (!access_token) {
        await refreshTokensAndAppKey();
    }
    return access_token;
}

async function getApplicationKey() {
    if (!applicationKey) {
        await refreshTokensAndAppKey();
    }
    return applicationKey;
}

async function loadApplicationKey(access_token, refresh_token) {
    await axios.put(
        'https://api.meethue.com/route/api/0/config',
        { linkbutton: true },
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        }
    );
    // Application Key erzeugen
    const appKeyResp = await axios.post(
        'https://api.meethue.com/route/api',
        { devicetype: "Availability Light" },
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        }
    );
    applicationKey = appKeyResp.data[0]?.success?.username;
    console.log("Application Key *** aktualisiert");
}

// Hole Access Token und Application Key mit Refresh Token
async function refreshTokensAndAppKey() {
    if (!refresh_token) {
        await loadRefreshToken();
    }

    // 1. Access Token holen
    const response = await axios.post(
        'https://api.meethue.com/v2/oauth2/token',
        qs.stringify({
            grant_type: 'refresh_token',
            refresh_token: refresh_token
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

    access_token = response.data.access_token;
    console.log("Access Token *** aktualisiert");

    refresh_token = response.data.refresh_token;
    console.log("Refresh Token *** aktualisiert");
    await saveRefreshToken(refresh_token);

    await loadApplicationKey(access_token, refresh_token);
}

module.exports = { refreshTokensAndAppKey, loadApplicationKey, loadRefreshToken, getAccessToken, getApplicationKey };