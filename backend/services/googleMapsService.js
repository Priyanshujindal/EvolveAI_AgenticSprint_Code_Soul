const axios = require('axios');
const { GOOGLE_API_KEY } = require('../config/config');

function haversineDistanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

async function findNearbyAmbulance({ lat, lng, radiusMeters = 5000 }) {
  if (!GOOGLE_API_KEY) return [];
  const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = {
    key: GOOGLE_API_KEY,
    location: `${lat},${lng}`,
    radius: radiusMeters,
    keyword: 'ambulance'
  };
  try {
    const { data } = await axios.get(url, { params });
    const results = Array.isArray(data?.results) ? data.results : [];
    const enriched = results.map((r) => {
      const location = r.geometry?.location;
      const distanceMeters = location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
        ? Math.round(haversineDistanceMeters({ lat, lng }, { lat: location.lat, lng: location.lng }))
        : null;
      return {
        name: r.name,
        address: r.vicinity || r.formatted_address || null,
        location,
        rating: r.rating,
        place_id: r.place_id,
        open_now: r.opening_hours?.open_now,
        user_ratings_total: r.user_ratings_total,
        distance_meters: distanceMeters
      };
    });
    enriched.sort((a, b) => {
      if (a.distance_meters == null && b.distance_meters == null) return 0;
      if (a.distance_meters == null) return 1;
      if (b.distance_meters == null) return -1;
      return a.distance_meters - b.distance_meters;
    });
    return enriched;
  } catch (err) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error_message || err.message || 'Google Places API error';
    throw new Error(`Maps error${status ? ' (' + status + ')' : ''}: ${message}`);
  }
}

module.exports = { findNearbyAmbulance };


