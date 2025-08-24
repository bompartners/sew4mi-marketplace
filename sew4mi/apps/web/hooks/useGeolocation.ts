'use client';

import { useState, useCallback, useEffect } from 'react';

interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface UseGeolocationResult {
  location: GeolocationPosition | null;
  isLoading: boolean;
  error: string | null;
  locationError: string | null;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
}

const LOCATION_STORAGE_KEY = 'sew4mi_user_location';
const LOCATION_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface StoredLocation {
  position: GeolocationPosition;
  timestamp: number;
}

export function useGeolocation(): UseGeolocationResult {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load cached location on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const { position, timestamp }: StoredLocation = JSON.parse(stored);
        
        // Check if cached location is still valid (within TTL)
        if (Date.now() - timestamp < LOCATION_CACHE_TTL) {
          setLocation(position);
        } else {
          // Remove expired cache
          localStorage.removeItem(LOCATION_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load cached location:', err);
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    }
  }, []);

  // Request user location
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser';
      setLocationError(errorMsg);
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            let errorMessage = 'Failed to get your location';
            
            switch (err.code) {
              case err.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
              case err.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable.';
                break;
              case err.TIMEOUT:
                errorMessage = 'Location request timed out.';
                break;
            }
            
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: false,
            timeout: 10000, // 10 seconds
            maximumAge: 5 * 60 * 1000, // 5 minutes
          }
        );
      });

      setLocation(position);

      // Cache the location
      try {
        const storedLocation: StoredLocation = {
          position,
          timestamp: Date.now(),
        };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(storedLocation));
      } catch (err) {
        console.warn('Failed to cache location:', err);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      setLocationError(errorMessage);
      console.error('Geolocation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear location and cache
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setLocationError(null);
    
    try {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear cached location:', err);
    }
  }, []);

  return {
    location,
    isLoading,
    error,
    locationError,
    requestLocation,
    clearLocation,
  };
}