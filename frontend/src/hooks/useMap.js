// frontend/src/hooks/useMap.js
import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

const useMap = (containerRef, initialOptions = {}) => {
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapInstance = useRef(null);

  // Default map options
  const defaultOptions = {
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [0, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 18,
    ...initialOptions
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapInstance.current) return;

    try {
      const mapInstance = new maplibregl.Map({
        container: containerRef.current,
        ...defaultOptions
      });

      // Map event listeners
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        setIsLoaded(true);
        setMap(mapInstance);
      });

      mapInstance.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(e.error.message);
      });

      mapInstance.on('zoom', () => {
        // console.log('Zoom level:', mapInstance.getZoom());
      });

      mapInstance.on('move', () => {
        // console.log('Map moved');
      });

      // Add navigation controls
      mapInstance.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
      );

      // Add scale control
      mapInstance.addControl(
        new maplibregl.ScaleControl(),
        'bottom-right'
      );

      mapInstance.current = mapInstance;

      return () => {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError(error.message);
    }
  }, [containerRef]);

  // Fly to location
  const flyTo = useCallback((options) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo({
        duration: 2000,
        ...options
      });
    }
  }, []);

  // Set center
  const setCenter = useCallback((center) => {
    if (mapInstance.current) {
      mapInstance.current.setCenter(center);
    }
  }, []);

  // Set zoom
  const setZoom = useCallback((zoom) => {
    if (mapInstance.current) {
      mapInstance.current.setZoom(zoom);
    }
  }, []);

  // Get bounds
  const getBounds = useCallback(() => {
    if (mapInstance.current) {
      return mapInstance.current.getBounds();
    }
    return null;
  }, []);

  // Fit bounds
  const fitBounds = useCallback((bounds, options = {}) => {
    if (mapInstance.current) {
      mapInstance.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
        ...options
      });
    }
  }, []);

  // Add layer
  const addLayer = useCallback((layer) => {
    if (mapInstance.current && isLoaded) {
      if (!mapInstance.current.getLayer(layer.id)) {
        mapInstance.current.addLayer(layer);
      }
    }
  }, [isLoaded]);

  // Remove layer
  const removeLayer = useCallback((layerId) => {
    if (mapInstance.current && mapInstance.current.getLayer(layerId)) {
      mapInstance.current.removeLayer(layerId);
    }
  }, []);

  // Add source
  const addSource = useCallback((sourceId, source) => {
    if (mapInstance.current && isLoaded) {
      if (!mapInstance.current.getSource(sourceId)) {
        mapInstance.current.addSource(sourceId, source);
      }
    }
  }, [isLoaded]);

  // Remove source
  const removeSource = useCallback((sourceId) => {
    if (mapInstance.current && mapInstance.current.getSource(sourceId)) {
      mapInstance.current.removeSource(sourceId);
    }
  }, []);

  // Get zoom level
  const getZoom = useCallback(() => {
    if (mapInstance.current) {
      return mapInstance.current.getZoom();
    }
    return null;
  }, []);

  // Get center
  const getCenter = useCallback(() => {
    if (mapInstance.current) {
      return mapInstance.current.getCenter();
    }
    return null;
  }, []);

  return {
    map,
    isLoaded,
    mapError,
    flyTo,
    setCenter,
    setZoom,
    getBounds,
    fitBounds,
    addLayer,
    removeLayer,
    addSource,
    removeSource,
    getZoom,
    getCenter
  };
};

export default useMap;