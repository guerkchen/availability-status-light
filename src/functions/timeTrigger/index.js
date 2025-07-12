const { handleLight } = require('../../handleLight');

module.exports = async function (context) {
    console.log('Timer trigger function processed a request.');
    try {
        await handleLight();
        context.log("Lampe erfolgreich gesteuert.");
    } catch (error) {
        console.error("Fehler beim Steuern der Lampe:", error);
        context.log("Interner Serverfehler:", error.message);
        return;
    }
}
