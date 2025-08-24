'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Maximize2, Star, Phone, MessageCircle } from 'lucide-react';
import { TailorSearchItem } from '@sew4mi/shared';
import { cn } from '@/lib/utils';

interface MapViewProps {
  tailors: TailorSearchItem[];
  userLocation?: { lat: number; lng: number } | null;
  selectedTailorId?: string | null;
  onTailorSelect?: (tailor: TailorSearchItem | null) => void;
  onMarkerClick?: (tailor: TailorSearchItem) => void;
  className?: string;
  height?: number;
}

interface GoogleMapMarker {
  position: { lat: number; lng: number };
  tailorId: string;
  marker?: google.maps.Marker;
  infoWindow?: google.maps.InfoWindow;
}

interface MarkerCluster {
  position: { lat: number; lng: number };
  tailors: TailorSearchItem[];
  marker?: google.maps.Marker;
  infoWindow?: google.maps.InfoWindow;
}

export function MapView({
  tailors,
  userLocation,
  selectedTailorId,
  onTailorSelect,
  onMarkerClick,
  className,
  height = 500,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<GoogleMapMarker[]>([]);
  const clustersRef = useRef<MarkerCluster[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [selectedTailor, setSelectedTailor] = useState<TailorSearchItem | null>(null);
  const [useClusterMode, setUseClusterMode] = useState(false);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Cluster nearby tailors
  const clusterTailors = useCallback((tailors: TailorSearchItem[], map: google.maps.Map): MarkerCluster[] => {
    const clusters: MarkerCluster[] = [];
    const processed = new Set<string>();
    const zoom = map.getZoom() || 10;
    
    // Adjust cluster radius based on zoom level
    const baseRadius = 5; // 5km at zoom 10
    const clusterRadius = baseRadius / Math.pow(2, zoom - 10);
    const minClusterSize = 3; // Minimum tailors to form a cluster
    
    tailors.forEach(tailor => {
      if (!tailor.location || processed.has(tailor.id)) return;
      
      // Find nearby tailors within cluster radius
      const nearbyTailors = tailors.filter(other => {
        if (!other.location || other.id === tailor.id || processed.has(other.id)) return false;
        
        const distance = calculateDistance(
          tailor.location!.lat, tailor.location!.lng,
          other.location.lat, other.location.lng
        );
        
        return distance <= clusterRadius;
      });
      
      // Create cluster if we have enough nearby tailors
      if (nearbyTailors.length >= minClusterSize - 1) {
        const clusterTailors = [tailor, ...nearbyTailors];
        
        // Calculate cluster center (centroid)
        const centerLat = clusterTailors.reduce((sum, t) => sum + t.location!.lat, 0) / clusterTailors.length;
        const centerLng = clusterTailors.reduce((sum, t) => sum + t.location!.lng, 0) / clusterTailors.length;
        
        clusters.push({
          position: { lat: centerLat, lng: centerLng },
          tailors: clusterTailors
        });
        
        // Mark all tailors in this cluster as processed
        clusterTailors.forEach(t => processed.add(t.id));
      }
    });
    
    return clusters;
  }, [calculateDistance]);

  // Create cluster marker
  const createClusterMarker = useCallback((cluster: MarkerCluster, map: google.maps.Map) => {
    const tailorCount = cluster.tailors.length;
    const avgRating = cluster.tailors.reduce((sum, t) => sum + t.rating, 0) / tailorCount;
    
    const marker = new google.maps.Marker({
      position: cluster.position,
      map,
      title: `${tailorCount} tailors in this area`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: Math.min(15 + tailorCount * 2, 30), // Scale with number of tailors
        fillColor: '#CE1126', // Kente red
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
      label: {
        text: tailorCount.toString(),
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });

    // Create cluster info window content
    const infoWindowContent = `
      <div class="p-4 max-w-sm">
        <div class="mb-3">
          <h4 class="font-semibold text-lg text-gray-900">${tailorCount} Tailors in this Area</h4>
          <div class="flex items-center gap-1 mt-1">
            <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span class="text-sm text-gray-600">Avg Rating: ${avgRating.toFixed(1)}</span>
          </div>
        </div>
        
        <div class="space-y-2 mb-4 max-h-40 overflow-y-auto">
          ${cluster.tailors.slice(0, 5).map(tailor => `
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
              ${tailor.profilePhoto ? `
                <img src="${tailor.profilePhoto}" alt="${tailor.businessName}" 
                     class="w-8 h-8 rounded-full object-cover">
              ` : `
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span class="text-xs text-gray-500">${tailor.businessName[0]}</span>
                </div>
              `}
              <div class="flex-1 min-w-0">
                <p class="font-medium text-xs text-gray-900 truncate">${tailor.businessName}</p>
                <div class="flex items-center gap-1">
                  <svg class="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span class="text-xs text-gray-500">${tailor.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          `).join('')}
          ${cluster.tailors.length > 5 ? `
            <div class="text-center">
              <span class="text-xs text-gray-500">+${cluster.tailors.length - 5} more tailors</span>
            </div>
          ` : ''}
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                  onclick="window.tailorMapActions?.zoomToCluster(${cluster.position.lat}, ${cluster.position.lng})">
            Zoom In
          </button>
          <button class="bg-gray-600 text-white text-sm py-2 px-3 rounded hover:bg-gray-700 transition-colors"
                  onclick="window.tailorMapActions?.showIndividualMarkers()">
            Show All
          </button>
        </div>
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent,
    });

    marker.addListener('click', () => {
      // Close other info windows
      clustersRef.current.forEach(c => {
        if (c.infoWindow && c !== cluster) {
          c.infoWindow.close();
        }
      });

      infoWindow.open(map, marker);
    });

    return { marker, infoWindow };
  }, []);

  // Load Google Maps API
  const loadGoogleMaps = useCallback(async () => {
    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    try {
      // In a real implementation, you'd get this from environment variables
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
      };
      
      script.onerror = () => {
        throw new Error('Failed to load Google Maps API');
      };

      document.head.appendChild(script);
    } catch (err) {
      console.error('Google Maps loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map');
      setIsLoading(false);
    }
  }, []);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !isGoogleMapsLoaded) return;

    try {
      // Default center to Ghana (Accra)
      const defaultCenter = { lat: 5.6037, lng: -0.1870 };
      const center = userLocation || defaultCenter;

      const map = new google.maps.Map(mapRef.current, {
        zoom: userLocation ? 13 : 7,
        center,
        styles: [
          {
            featureType: 'poi.business',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'poi.medical',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapInstanceRef.current = map;
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, [isGoogleMapsLoaded, userLocation]);

  // Create tailor marker
  const createTailorMarker = useCallback((tailor: TailorSearchItem, map: google.maps.Map) => {
    if (!tailor.location) return null;

    const marker = new google.maps.Marker({
      position: tailor.location,
      map,
      title: tailor.businessName,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: tailor.id === selectedTailorId ? '#FFD700' : '#CE1126', // Kente colors
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });

    // Create info window content
    const infoWindowContent = `
      <div class="p-3 max-w-xs">
        <div class="flex items-start gap-3">
          ${tailor.profilePhoto ? `
            <img src="${tailor.profilePhoto}" alt="${tailor.businessName}" 
                 class="w-12 h-12 rounded-full object-cover flex-shrink-0">
          ` : `
            <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
          `}
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-sm text-gray-900 truncate">${tailor.businessName}</h4>
            <div class="flex items-center gap-1 mt-1">
              <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span class="text-sm text-gray-600">${tailor.rating.toFixed(1)} (${tailor.totalReviews} reviews)</span>
            </div>
            ${tailor.city ? `
              <div class="flex items-center gap-1 mt-1">
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="text-xs text-gray-500">${tailor.city}</span>
              </div>
            ` : ''}
            ${tailor.specializations?.length ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${tailor.specializations.slice(0, 2).map(spec => `
                  <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">${spec}</span>
                `).join('')}
                ${tailor.specializations.length > 2 ? `
                  <span class="text-xs text-gray-500">+${tailor.specializations.length - 2} more</span>
                ` : ''}
              </div>
            ` : ''}
            <div class="flex gap-2 mt-3">
              <button class="flex-1 bg-blue-600 text-white text-xs py-1.5 px-2 rounded hover:bg-blue-700 transition-colors"
                      onclick="window.tailorMapActions?.viewProfile('${tailor.id}')">
                View Profile
              </button>
              <button class="bg-green-600 text-white text-xs py-1.5 px-2 rounded hover:bg-green-700 transition-colors"
                      onclick="window.tailorMapActions?.contact('${tailor.id}')">
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent,
    });

    marker.addListener('click', () => {
      // Close other info windows
      markersRef.current.forEach(m => {
        if (m.infoWindow && m.tailorId !== tailor.id) {
          m.infoWindow.close();
        }
      });

      infoWindow.open(map, marker);
      setSelectedTailor(tailor);
      onTailorSelect?.(tailor);
      onMarkerClick?.(tailor);
    });

    return { marker, infoWindow, tailorId: tailor.id };
  }, [selectedTailorId, onTailorSelect, onMarkerClick]);

  // Update markers when tailors change
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    // Clear existing markers and clusters
    markersRef.current.forEach(({ marker, infoWindow }) => {
      marker?.setMap(null);
      infoWindow?.close();
    });
    markersRef.current = [];
    
    clustersRef.current.forEach(({ marker, infoWindow }) => {
      marker?.setMap(null);
      infoWindow?.close();
    });
    clustersRef.current = [];

    // Add user location marker
    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }

      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4F46E5',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });
    }

    // Add tailor markers or clusters
    const validTailors = tailors.filter(tailor => tailor.location);
    const zoom = map.getZoom() || 10;
    const shouldCluster = useClusterMode && validTailors.length >= 10 && zoom <= 12;
    
    if (shouldCluster) {
      // Create clusters
      const clusters = clusterTailors(validTailors, map);
      const unclusteredTailors = validTailors.filter(tailor => 
        !clusters.some(cluster => cluster.tailors.some(t => t.id === tailor.id))
      );
      
      // Add cluster markers
      clusters.forEach(cluster => {
        const clusterData = createClusterMarker(cluster, map);
        if (clusterData) {
          clustersRef.current.push({
            ...cluster,
            marker: clusterData.marker,
            infoWindow: clusterData.infoWindow,
          });
        }
      });
      
      // Add individual markers for unclustered tailors
      unclusteredTailors.forEach(tailor => {
        const markerData = createTailorMarker(tailor, map);
        if (markerData) {
          markersRef.current.push({
            position: tailor.location!,
            tailorId: tailor.id,
            marker: markerData.marker,
            infoWindow: markerData.infoWindow,
          });
        }
      });
    } else {
      // Individual markers only
      validTailors.forEach(tailor => {
        const markerData = createTailorMarker(tailor, map);
        if (markerData) {
          markersRef.current.push({
            position: tailor.location!,
            tailorId: tailor.id,
            marker: markerData.marker,
            infoWindow: markerData.infoWindow,
          });
        }
      });
    }

    // Adjust bounds to show all markers
    if (validTailors.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      if (userLocation) {
        bounds.extend(userLocation);
      }
      
      validTailors.forEach(tailor => {
        if (tailor.location) {
          bounds.extend(tailor.location);
        }
      });

      map.fitBounds(bounds);
      
      // Don't zoom in too much for single markers
      const listener = map.addListener('bounds_changed', () => {
        if (map.getZoom()! > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [tailors, userLocation, isGoogleMapsLoaded, createTailorMarker]);

  // Center map on selected tailor
  const centerOnTailor = useCallback((tailorId: string) => {
    const map = mapInstanceRef.current;
    const marker = markersRef.current.find(m => m.tailorId === tailorId);
    
    if (map && marker) {
      map.panTo(marker.position);
      map.setZoom(15);
      
      // Open info window
      if (marker.infoWindow && marker.marker) {
        // Close other info windows
        markersRef.current.forEach(m => {
          if (m.infoWindow && m.tailorId !== tailorId) {
            m.infoWindow.close();
          }
        });
        
        marker.infoWindow.open(map, marker.marker);
      }
    }
  }, []);

  // Setup global actions for info window buttons
  useEffect(() => {
    window.tailorMapActions = {
      viewProfile: (tailorId: string) => {
        const tailor = tailors.find(t => t.id === tailorId);
        if (tailor) {
          console.log('Navigate to tailor profile:', tailorId);
          window.open(`/tailors/${tailorId}`, '_blank');
        }
      },
      contact: (tailorId: string) => {
        const tailor = tailors.find(t => t.id === tailorId);
        if (tailor) {
          console.log('Contact tailor:', tailorId);
          if (tailor.user?.whatsappNumber) {
            const message = `Hello! I found your profile on Sew4Mi and I'm interested in your tailoring services.`;
            const whatsappUrl = `https://wa.me/${tailor.user.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }
        }
      },
      zoomToCluster: (lat: number, lng: number) => {
        const map = mapInstanceRef.current;
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(15);
          // Disable clustering at this zoom level to show individual markers
          setUseClusterMode(false);
          // Re-render markers after zoom
          setTimeout(() => updateMarkers(), 300);
        }
      },
      showIndividualMarkers: () => {
        setUseClusterMode(false);
        updateMarkers();
      },
    };

    return () => {
      delete window.tailorMapActions;
    };
  }, [tailors]);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded) {
      initializeMap();
    }
  }, [isGoogleMapsLoaded, initializeMap]);

  // Update markers when tailors change
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  // Handle external tailor selection
  useEffect(() => {
    if (selectedTailorId) {
      centerOnTailor(selectedTailorId);
    }
  }, [selectedTailorId, centerOnTailor]);

  // Auto-enable clustering based on zoom and tailor count
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    const validTailorCount = tailors.filter(t => t.location).length;
    const zoom = map.getZoom() || 10;
    
    // Auto-enable clustering for dense areas like Accra when zoomed out
    const shouldAutoCluster = validTailorCount >= 15 && zoom <= 11;
    
    if (shouldAutoCluster !== useClusterMode) {
      setUseClusterMode(shouldAutoCluster);
    }
  }, [tailors, isGoogleMapsLoaded, useClusterMode]);

  // Listen to zoom changes to re-evaluate clustering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const zoomChangeListener = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom() || 10;
      const validTailorCount = tailors.filter(t => t.location).length;
      const shouldAutoCluster = validTailorCount >= 15 && zoom <= 11;
      
      if (shouldAutoCluster !== useClusterMode) {
        setUseClusterMode(shouldAutoCluster);
        // Re-render markers after zoom change
        setTimeout(() => updateMarkers(), 100);
      }
    });

    return () => {
      google.maps.event.removeListener(zoomChangeListener);
    };
  }, [tailors, useClusterMode, updateMarkers]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(location);
          mapInstanceRef.current.setZoom(13);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Failed to get current location');
      }
    );
  }, []);

  if (error && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    // Fallback when Google Maps is not configured
    return (
      <Card className={cn('p-8 text-center', className)} style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <MapPin className="h-16 w-16 text-gray-300" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map View</h3>
            <p className="text-gray-500 mb-4">
              Map functionality requires Google Maps API configuration
            </p>
            <div className="grid gap-2 max-w-sm">
              {tailors.slice(0, 3).map(tailor => (
                <Card key={tailor.id} className="p-3 text-left">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{tailor.businessName}</p>
                      <p className="text-xs text-gray-500">{tailor.city}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {tailors.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{tailors.length - 3} more tailors
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div 
        ref={mapRef} 
        className="w-full rounded-lg overflow-hidden"
        style={{ height }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">{error}</p>
            <Button onClick={loadGoogleMaps} size="sm" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Map controls */}
      {!isLoading && !error && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            onClick={getCurrentLocation}
            size="sm"
            className="bg-white text-gray-700 hover:bg-gray-50 border shadow-md"
            title="Get current location"
          >
            <Navigation className="h-4 w-4" />
          </Button>
          
          {tailors.filter(t => t.location).length >= 10 && (
            <Button
              onClick={() => {
                setUseClusterMode(!useClusterMode);
                setTimeout(() => updateMarkers(), 100);
              }}
              size="sm"
              className={cn(
                "bg-white text-gray-700 hover:bg-gray-50 border shadow-md text-xs px-2 py-1",
                useClusterMode && "bg-blue-50 text-blue-700 border-blue-200"
              )}
              title={useClusterMode ? "Show individual markers" : "Enable marker clustering"}
            >
              {useClusterMode ? "Individual" : "Cluster"}
            </Button>
          )}
        </div>
      )}

      {/* Selected tailor info */}
      {selectedTailor && (
        <Card className="absolute bottom-4 left-4 right-4 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            {selectedTailor.profilePhoto ? (
              <img
                src={selectedTailor.profilePhoto}
                alt={selectedTailor.businessName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 truncate">
                    {selectedTailor.businessName}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">
                      {selectedTailor.rating.toFixed(1)} ({selectedTailor.totalReviews} reviews)
                    </span>
                  </div>
                  {selectedTailor.city && (
                    <p className="text-sm text-gray-500 mt-1">{selectedTailor.city}</p>
                  )}
                </div>
                
                <Button
                  onClick={() => setSelectedTailor(null)}
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
              
              {selectedTailor.specializations && selectedTailor.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTailor.specializations.slice(0, 3).map(spec => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                  {selectedTailor.specializations.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedTailor.specializations.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">
                  <Phone className="h-4 w-4 mr-1" />
                  View Profile
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Contact
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}