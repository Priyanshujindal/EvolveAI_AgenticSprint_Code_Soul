const axios = require('axios');
const { GOOGLE_API_KEY } = require('../config/config');

async function findNearbyAmbulance({ lat, lng, radiusMeters = 5000 }) {
  if (!GOOGLE_API_KEY) return [];
  const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = {
    key: GOOGLE_API_KEY,
    location: `${lat},${lng}`,
    radius: radiusMeters,
    keyword: 'ambulance'
  };
  const { data } = await axios.get(url, { params });
  return (data?.results || []).map(r => ({
    name: r.name,
    address: r.vicinity,
    location: r.geometry?.location,
    rating: r.rating,
    place_id: r.place_id
  }));
}

module.exports = { findNearbyAmbulance };


