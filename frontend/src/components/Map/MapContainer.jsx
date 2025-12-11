// frontend/src/components/Map/MapContainer.jsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import WindParticleLayer from './WindParticleLayer';

const MapContainer = ({
  country,
  activeFilters,
  weatherData,
  showWindParticles,
  timelineHour,
  onMapReady
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const layerIds = useRef([]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20], // Global center
      zoom: 2,
      minZoom: 1,
      maxZoom: 12
    });

    map.current.on("load", () => {
      console.log("Map loaded successfully");
      setMapLoaded(true);
      if (onMapReady) onMapReady();
    });

    map.current.on("error", (e) => {
      console.error("Map error:", e);
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Navigate to country (don't reload data)
  useEffect(() => {
    if (map.current && country) {
      map.current.flyTo({
        center: country.center,
        zoom: 5,
        duration: 2000
      });
    }
  }, [country]);

  // Load GLOBAL weather layers once from REAL API
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    console.log('Loading global weather layers from API...');

    // Remove previous layers
    layerIds.current.forEach((sourceId) => {
      const layerId = `${sourceId}-layer`;
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });
    layerIds.current = [];

    const activeLayers = Object.entries(activeFilters).filter(([_, active]) => active);

    if (activeLayers.length === 0) {
      return;
    }

    // Fetch REAL data for each active layer
    activeLayers.forEach(async ([layerName]) => {
      const sourceId = `weather-${layerName}`;
      console.log(`Fetching REAL ${layerName} data from API...`);

      try {
        // Import the API service
        const { weatherAPI } = await import('../../services/api');
        
        // Fetch real global data
        const response = await weatherAPI.getGlobalWeatherLayer(layerName);
        const globalData = response.data;

        console.log(`✓ Received ${globalData.length} real data points for ${layerName}`);

        const features = globalData.map((point) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat]
          },
          properties: {
            value: point.value,
            normalizedValue: normalizeValue(point.value, layerName)
          }
        }));

        const geojson = {
          type: "FeatureCollection",
          features
        };

        // Add source
        if (map.current.getSource(sourceId)) {
          map.current.getSource(sourceId).setData(geojson);
        } else {
          map.current.addSource(sourceId, {
            type: "geojson",
            data: geojson
          });

          // Add layer with blurred circles (heatmap effect)
          const layerId = `${sourceId}-layer`;
          map.current.addLayer({
            id: layerId,
            type: "circle",
            source: sourceId,
            paint: {
              "circle-radius": [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                1, 15,
                3, 25,
                5, 35,
                7, 45,
                10, 60
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "normalizedValue"],
                0, getColorAtValue(layerName, 0),
                0.2, getColorAtValue(layerName, 0.2),
                0.4, getColorAtValue(layerName, 0.4),
                0.6, getColorAtValue(layerName, 0.6),
                0.8, getColorAtValue(layerName, 0.8),
                1, getColorAtValue(layerName, 1)
              ],
              "circle-opacity": 0.35,
              "circle-blur": 1.0
            }
          });
          
          layerIds.current.push(sourceId);
        }

        console.log(`✓ Rendered REAL ${layerName} layer on map`);

      } catch (error) {
        console.error(`Failed to fetch ${layerName}:`, error);
        // Fallback to procedural if API fails
        console.warn(`Using fallback data for ${layerName}`);
        const fallbackData = generateGlobalWeatherData(layerName);
        
        const features = fallbackData.map((point) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat]
          },
          properties: {
            value: point.value,
            normalizedValue: normalizeValue(point.value, layerName)
          }
        }));

        const geojson = {
          type: "FeatureCollection",
          features
        };

        if (!map.current.getSource(sourceId)) {
          map.current.addSource(sourceId, {
            type: "geojson",
            data: geojson
          });

          const layerId = `${sourceId}-layer`;
          map.current.addLayer({
            id: layerId,
            type: "circle",
            source: sourceId,
            paint: {
              "circle-radius": [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                1, 15,
                3, 25,
                5, 35,
                7, 45,
                10, 60
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "normalizedValue"],
                0, getColorAtValue(layerName, 0),
                0.2, getColorAtValue(layerName, 0.2),
                0.4, getColorAtValue(layerName, 0.4),
                0.6, getColorAtValue(layerName, 0.6),
                0.8, getColorAtValue(layerName, 0.8),
                1, getColorAtValue(layerName, 1)
              ],
              "circle-opacity": 0.35,
              "circle-blur": 1.0
            }
          });
          
          layerIds.current.push(sourceId);
        }
      }
    });
  }, [activeFilters, mapLoaded]);

  // Generate GLOBAL weather data (entire world)
  const generateGlobalWeatherData = (layerName) => {
    const points = [];
    const density = 3000; // Points across entire globe

    // World bounds
    const bounds = {
      minLat: -85,
      maxLat: 85,
      minLng: -180,
      maxLng: 180
    };

    // Create global weather systems
    const systems = [];
    const numSystems = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < numSystems; i++) {
      systems.push({
        lat: bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat),
        lng: bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng),
        intensity: 0.3 + Math.random() * 0.7,
        radius: 10 + Math.random() * 20 // degrees
      });
    }

    // Generate scattered points globally
    for (let i = 0; i < density; i++) {
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);

      // Calculate value based on systems + latitude + noise
      let value = 0;
      let totalWeight = 0;

      systems.forEach(system => {
        const distance = Math.sqrt(
          Math.pow(lat - system.lat, 2) + 
          Math.pow(lng - system.lng, 2)
        );
        
        if (distance < system.radius) {
          const weight = Math.exp(-distance / system.radius * 2);
          value += system.intensity * weight;
          totalWeight += weight;
        }
      });

      // Add latitude-based gradient (temperature varies with latitude)
      const latFactor = layerName === 'temperature' 
        ? Math.cos((lat * Math.PI) / 180) * 0.5 + 0.5
        : 0.5;

      // Add Perlin-like noise
      const seed = lat * 0.05 + lng * 0.05;
      const noise = (Math.sin(seed * 15) * Math.cos(seed * 12) + 1) * 0.5;

      const combined = totalWeight > 0 
        ? (value / totalWeight) * 0.5 + noise * 0.3 + latFactor * 0.2
        : noise * 0.7 + latFactor * 0.3;

      // Scale to layer range
      let scaledValue;
      switch(layerName) {
        case 'temperature':
          scaledValue = -10 + combined * 50; // -10 to 40°C
          break;
        case 'rain':
          scaledValue = combined * 100;
          break;
        case 'wind':
          scaledValue = 5 + combined * 40;
          break;
        case 'clouds':
          scaledValue = combined * 100;
          break;
        case 'storm':
          scaledValue = combined > 0.7 ? combined * 100 : combined * 25;
          break;
        default:
          scaledValue = combined * 100;
      }

      points.push({ 
        lat: parseFloat(lat.toFixed(4)), 
        lng: parseFloat(lng.toFixed(4)), 
        value: parseFloat(scaledValue.toFixed(2))
      });
    }

    return points;
  };

  const normalizeValue = (value, layerName) => {
    const ranges = {
      temperature: { min: -10, max: 40 },
      rain: { min: 0, max: 100 },
      wind: { min: 0, max: 45 },
      clouds: { min: 0, max: 100 },
      storm: { min: 0, max: 100 }
    };
    
    const range = ranges[layerName] || { min: 0, max: 100 };
    return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  };

  const getColorAtValue = (layerName, normalizedValue) => {
    const colorSchemes = {
      rain: ["#1a1a2e", "#2166ac", "#4393c3", "#92c5de", "#67a9cf", "#053470"],
      wind: ["#1a1a2e", "#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
      temperature: ["#1a1a2e", "#4575b4", "#74add1", "#fee090", "#f46d43", "#d73027"],
      clouds: ["#1a1a2e", "#f7f7f7", "#cccccc", "#969696", "#525252"],
      storm: ["#1a1a2e", "#9e0142", "#d53e4f", "#f46d43", "#fee08b"]
    };

    const colors = colorSchemes[layerName] || colorSchemes.temperature;
    const index = Math.floor(normalizedValue * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {showWindParticles && mapLoaded && (
        <WindParticleLayer map={map.current} />
      )}

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-lg text-sm shadow-lg">
        <div className="text-gray-400">
          Viewing:{" "}
          <span className="text-white font-semibold">
            {country?.name || "World"}
          </span>
        </div>

        {timelineHour > 0 && (
          <div className="text-blue-400 mt-1">Forecast: +{timelineHour}h</div>
        )}
      </div>
    </div>
  );
};

export default MapContainer;