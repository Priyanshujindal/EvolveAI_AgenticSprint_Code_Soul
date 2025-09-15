const { findNearbyAmbulance } = require('../services/googleMapsService');

module.exports = async function findNearbyAmbulanceFn(req, res) {
  try {
    const { lat, lng } = req.query || {};
    const data = await findNearbyAmbulance({ lat: Number(lat), lng: Number(lng) });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


