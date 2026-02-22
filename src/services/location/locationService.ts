// services/location/locationService.js

import Geolocation from '@react-native-community/geolocation';

/**
 * Get current location
 * Uses your existing fetchLocationOptimized logic
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
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
        // Return null if location fails (won't block login)
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};