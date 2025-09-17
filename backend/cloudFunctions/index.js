const functions = require('firebase-functions');

const analyzeCheckin = require('./analyzeCheckin');
const riskSeries = require('./riskSeries');
const processReport = require('./processReport');
const chatWithGemini = require('./chatWithGemini');
const findNearbyAmbulance = require('./findNearbyAmbulance');

exports.analyzeCheckin = functions.https.onRequest(analyzeCheckin);
exports.riskSeries = functions.https.onRequest(riskSeries);
exports.processReport = functions.https.onRequest(processReport);
exports.chatWithGemini = functions.https.onRequest(chatWithGemini);
exports.findNearbyAmbulance = functions.https.onRequest(findNearbyAmbulance);


