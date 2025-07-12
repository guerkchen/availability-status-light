const { handleLight } = require('../../handleLight');

module.exports = async function (context, req) {
    console.log('HTTP trigger function processed a request.');
    if (req.method != "POST") {
        context.res = { status: 405, body: "Method not allowed." };
        return;
    }

    try {
        await handleLight();
        context.res = { status: 200, body: "Lampe erfolgreich gesteuert." };
    } catch (error) {
        console.error("Fehler beim Steuern der Lampe:", error);
        context.res = { status: 500, body: "Interner Serverfehler: " + error.message };
        return;
    }

};