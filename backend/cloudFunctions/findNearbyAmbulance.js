const { findNearbyAmbulance } = require('../services/googleMapsService');

module.exports = async function findNearbyAmbulanceFn(req, res) {
  try {
    const { lat, lng, radiusMeters } = req.query || {};

    const latitude = Number(lat);
    const longitude = Number(lng);
    const radius = radiusMeters !== undefined ? Number(radiusMeters) : undefined;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ ok: false, error: 'Invalid coordinates: lat and lng are required numbers.' });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ ok: false, error: 'Coordinates out of range.' });
    }
    if (radius !== undefined && (!Number.isFinite(radius) || radius <= 0)) {
      return res.status(400).json({ ok: false, error: 'radiusMeters must be a positive number if provided.' });
    }

    const data = await findNearbyAmbulance({ lat: latitude, lng: longitude, radiusMeters: radius });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Internal Server Error' });
  }
};


