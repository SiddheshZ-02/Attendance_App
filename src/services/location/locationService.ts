// services/location/locationService.js

import Geolocation from '@react-native-community/geolocation';

/**
 * Get current location with optimized strategy:
 * 1. Try to get a cached/coarse location immediately for fast UI feedback.
 * 2. Optionally fallback to high accuracy if needed.
 */
export const getFastLocation = () => {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isCached: true
        });
      },
      error => {
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 2000,
        maximumAge: 60000 // Accept a location up to 1 minute old
      }
    );
  });
};

export const getCurrentLocation = (highAccuracy = true) => {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      error => {
        console.warn('Location error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 10000 : 5000,
        maximumAge: highAccuracy ? 0 : 30000
      }
    );
  });
};
