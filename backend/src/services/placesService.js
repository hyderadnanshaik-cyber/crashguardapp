'use strict';

/**
 * @file placesService.js
 * @description Google Places API integration for nearby hospital lookup & telephone details.
 */

const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Find top 3 nearest hospitals using Google Places Nearby Search & Details API.
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Array<Object>>} List of hospital objects.
 */
async function findNearestHospitals(latitude, longitude) {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.includes('placeholder')) {
    console.warn('[Places API] Using fallback hospital routing mock data (No valid GOOGLE_PLACES_API_KEY).');
    return [
      {
        name: 'City Trauma & Emergency Center',
        distance: '1.2 km',
        vicinity: 'Central Medical District',
        phone: '+1 800 555 0199',
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude + 0.01},${longitude + 0.01}`,
      },
      {
        name: 'St. Jude Memorial Hospital',
        distance: '3.4 km',
        vicinity: 'North Wing Boulevard',
        phone: '+1 800 555 0122',
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude - 0.02},${longitude + 0.02}`,
      },
      {
        name: 'General Red Cross Hospital',
        distance: '5.1 km',
        vicinity: 'East Avenue Emergency Bay',
        phone: '+1 800 555 0177',
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude + 0.02},${longitude - 0.02}`,
      },
    ];
  }

  try {
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=10000&type=hospital&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await axios.get(nearbyUrl);

    if (!response.data || response.data.status !== 'OK' || !response.data.results) {
      console.warn('[Places API] Nearby search returned non-OK status:', response.data.status);
      return [];
    }

    const topResults = response.data.results.slice(0, 3);

    const hospitalDetailsPromises = topResults.map(async (place) => {
      let phone = 'N/A';
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${GOOGLE_PLACES_API_KEY}`;
        const detailsRes = await axios.get(detailsUrl);
        if (detailsRes.data?.result?.formatted_phone_number) {
          phone = detailsRes.data.result.formatted_phone_number;
        }
      } catch (err) {
        console.warn(`[Places API] Could not fetch details for place ${place.place_id}:`, err.message);
      }

      const destLat = place.geometry?.location?.lat || latitude;
      const destLng = place.geometry?.location?.lng || longitude;

      return {
        name: place.name,
        vicinity: place.vicinity || '',
        phone,
        placeId: place.place_id,
        location: { latitude: destLat, longitude: destLng },
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`,
      };
    });

    return await Promise.all(hospitalDetailsPromises);
  } catch (error) {
    console.error('[Places API] Error querying Google Places API:', error.message);
    return [];
  }
}

module.exports = {
  findNearestHospitals,
};
