const SunCalc = require('suncalc')
const axios = require('axios')

async function berechneLampenHelligkeit() {
    // Standardwerte (Baiersdorf, Deutschland)
    const lat = parseFloat(process.env.LAT) || 49.6461
    const lon = parseFloat(process.env.LON) || 11.0312

    const gewichtung = {
        sonne: parseFloat(process.env.W_SONNE),
        wolken: parseFloat(process.env.W_WOLKEN),
        regen: parseFloat(process.env.W_REGEN)
    }

    // Standardgewichtung, falls nicht gesetzt oder ungültig
    if (isNaN(gewichtung.sonne)) {
        console.warn('⚠️ W_SONNE nicht gesetzt – verwende 0.6')
        gewichtung.sonne = 0.6
    }
    if (isNaN(gewichtung.wolken)) {
        console.warn('⚠️ W_WOLKEN nicht gesetzt – verwende 0.3')
        gewichtung.wolken = 0.3
    }
    if (isNaN(gewichtung.regen)) {
        console.warn('⚠️ W_REGEN nicht gesetzt – verwende 0.1')
        gewichtung.regen = 0.1
    }

    const date = new Date()

    // Wetterdaten von Open-Meteo abrufen
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloudcover,precipitation`

    let cloud = 0.5
    let rain = 0.0

    try {
        console.log('🔄 Abrufen der Wetterdaten von Open-Meteo:', url)
        const response = await axios.get(url)
        const data = response.data?.current ?? {}
        cloud = (data.cloudcover ?? 50)
        rain = Math.min((data.precipitation ?? 0) / 5, 1) * 100.0
    } catch (err) {
        console.error('⚠️ Fehler beim Abrufen der Wetterdaten von Open-Meteo:', err.message)
        console.warn('👉 Verwende cloud=0.5 und rain=0.0 als Fallback')
    }

    const sunPos = SunCalc.getPosition(date, lat, lon)
    const elevation = sunPos.altitude * (180 / Math.PI)

    const helligkeitSonne = Math.max(0, Math.min(1, elevation / 15)) * 100.0

    const gesamtHelligkeit = (
        gewichtung.sonne * helligkeitSonne +
        gewichtung.wolken * (1 - cloud) +
        gewichtung.regen * (1 - rain)
    ) / (gewichtung.sonne + gewichtung.wolken + gewichtung.regen)

    const faktor = parseFloat(process.env.LAMPE_FAKTOR) || 1.0
    const offset = parseFloat(process.env.LAMPE_OFFSET) || 0.0
    const lampenHelligkeit = Math.max(0, Math.min(100, (gesamtHelligkeit * faktor) + offset))
    return Math.floor(lampenHelligkeit)
}

module.exports = { berechneLampenHelligkeit };
