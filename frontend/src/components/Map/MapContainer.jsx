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
      center: country ? country.center : [0, 0],
      zoom: 5,
      minZoom: 2,
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

  // Update map center when country changes
  useEffect(() => {
    if (map.current && country) {
      map.current.flyTo({
        center: country.center,
        zoom: 5,
        duration: 2000
      });
    }
  }, [country]);

  // Update weather layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !country) return;

    console.log('Updating weather layers...');

    // Remove ALL previous layers and sources
    layerIds.current.forEach((sourceId) => {
      const heatmapId = `${sourceId}-heatmap`;
      const circleId = `${sourceId}-circle`;
      
      if (map.current.getLayer(heatmapId)) {
        map.current.removeLayer(heatmapId);
      }
      if (map.current.getLayer(circleId)) {
        map.current.removeLayer(circleId);
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

    activeLayers.forEach(([layerName]) => {
      let layerData = weatherData?.layers?.[layerName];
      
      // Generate data with natural distribution
      if (!layerData || layerData.length < 50) {
        console.warn(`Generating natural distribution for ${layerName}`);
        layerData = generateNaturalWeatherData(country.bounds, layerName);
      }

      const sourceId = `weather-${layerName}`;
      console.log(`Creating ${layerName} with ${layerData.length} points`);

      const features = layerData.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.lng, point.lat]
        },
        properties: {
          value: point.value || 50,
          normalizedValue: normalizeValue(point.value || 50, layerName)
        }
      }));

      const geojson = {
        type: "FeatureCollection",
        features
      };

      // Add source
      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson
      });

      // Add heatmap layer with VALUE-BASED colors (zoom-stable)
      const heatmapId = `${sourceId}-heatmap`;
      map.current.addLayer({
        id: heatmapId,
        type: "circle",
        source: sourceId,
        maxzoom: 10,
        paint: {
          // Create heatmap effect with large, blurred circles
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 35,
            3, 45,
            5, 55,
            7, 65,
            10, 80
          ],
          // Color based on actual data value - STAYS CONSISTENT
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "normalizedValue"],
            0, getCircleColorAtValue(layerName, 0),
            0.2, getCircleColorAtValue(layerName, 0.2),
            0.4, getCircleColorAtValue(layerName, 0.4),
            0.6, getCircleColorAtValue(layerName, 0.6),
            0.8, getCircleColorAtValue(layerName, 0.8),
            1, getCircleColorAtValue(layerName, 1)
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 0.4,
            5, 0.45,
            8, 0.35,
            10, 0
          ],
          // Heavy blur creates smooth heatmap effect
          "circle-blur": 1.0
        }
      });

      // Add circle layer for detail
      const circleId = `${sourceId}-circle`;
      map.current.addLayer({
        id: circleId,
        type: "circle",
        source: sourceId,
        minzoom: 8,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 5,
            10, 10,
            12, 16
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "normalizedValue"],
            0, getCircleColorAtValue(layerName, 0),
            0.25, getCircleColorAtValue(layerName, 0.25),
            0.5, getCircleColorAtValue(layerName, 0.5),
            0.75, getCircleColorAtValue(layerName, 0.75),
            1, getCircleColorAtValue(layerName, 1)
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 0,
            9, 0.5,
            10, 0.75
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255, 255, 255, 0.4)",
          "circle-stroke-opacity": 0.4,
          "circle-blur": 0.4
        }
      });
      
      layerIds.current.push(sourceId);
    });
  }, [activeFilters, weatherData, mapLoaded, country]);

  // Generate natural weather data with random scatter (not grid)
  const generateNaturalWeatherData = (bounds, layerName) => {
    const points = [];
    const numPoints = 2000; // Many scattered points for natural coverage
    
    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;

    // Add margin for smoother edges
    const margin = 0.1;
    const marginLat = latRange * margin;
    const marginLng = lngRange * margin;

    console.log(`Generating ${numPoints} scattered points for ${layerName}`);

    // Create weather systems (centers of high/low pressure, storms, etc.)
    const weatherSystems = [];
    const numSystems = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numSystems; i++) {
      weatherSystems.push({
        lat: bounds.minLat + Math.random() * latRange,
        lng: bounds.minLng + Math.random() * lngRange,
        intensity: 0.3 + Math.random() * 0.7,
        radius: 0.15 + Math.random() * 0.25
      });
    }

    // Generate scattered points with natural distribution
    for (let i = 0; i < numPoints; i++) {
      // Random position with slight bias toward center
      const bias = 0.3;
      const randLat = Math.random() < bias 
        ? bounds.minLat + latRange * (0.3 + Math.random() * 0.4)
        : bounds.minLat - marginLat + (latRange + 2 * marginLat) * Math.random();
      
      const randLng = Math.random() < bias
        ? bounds.minLng + lngRange * (0.3 + Math.random() * 0.4)
        : bounds.minLng - marginLng + (lngRange + 2 * marginLng) * Math.random();

      const lat = randLat;
      const lng = randLng;
      
      // Calculate value based on distance to weather systems
      let value = 0;
      let totalWeight = 0;

      weatherSystems.forEach(system => {
        const distance = Math.sqrt(
          Math.pow((lat - system.lat) / latRange, 2) + 
          Math.pow((lng - system.lng) / lngRange, 2)
        );
        
        if (distance < system.radius) {
          const weight = Math.exp(-distance / system.radius * 3);
          value += system.intensity * weight;
          totalWeight += weight;
        }
      });

      // Add base noise
      const seed = lat * 0.1 + lng * 0.1;
      const noise = Math.sin(seed * 15) * Math.cos(seed * 12);
      const baseValue = (noise + 1) * 0.5;

      // Combine system influence with base noise
      const combinedValue = totalWeight > 0 
        ? (value / totalWeight) * 0.7 + baseValue * 0.3
        : baseValue;

      // Scale to layer-specific range
      let scaledValue;
      switch(layerName) {
        case 'temperature':
          scaledValue = 10 + combinedValue * 25; // 10-35°C
          break;
        case 'rain':
          scaledValue = combinedValue * 80; // 0-80mm
          break;
        case 'wind':
          scaledValue = 5 + combinedValue * 35; // 5-40 km/h
          break;
        case 'clouds':
          scaledValue = combinedValue * 100; // 0-100%
          break;
        case 'storm':
          scaledValue = combinedValue > 0.7 ? combinedValue * 100 : combinedValue * 30;
          break;
        default:
          scaledValue = combinedValue * 100;
      }

      points.push({ 
        lat: parseFloat(lat.toFixed(5)), 
        lng: parseFloat(lng.toFixed(5)), 
        value: parseFloat(scaledValue.toFixed(2))
      });
    }

    return points;
  };

  const normalizeValue = (value, layerName) => {
    const ranges = {
      temperature: { min: 5, max: 35 },
      rain: { min: 0, max: 80 },
      wind: { min: 0, max: 40 },
      clouds: { min: 0, max: 100 },
      storm: { min: 0, max: 100 }
    };
    
    const range = ranges[layerName] || { min: 0, max: 100 };
    return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  };

  const getColorAtValue = (layerName, normalizedValue) => {
    const colorSchemes = {
      rain: [
        { stop: 0, color: "rgba(33, 102, 172, 0)" },
        { stop: 0.2, color: "rgba(67, 147, 195, 0.5)" },
        { stop: 0.5, color: "rgba(146, 197, 222, 0.75)" },
        { stop: 0.8, color: "rgba(103, 169, 207, 0.9)" },
        { stop: 1, color: "rgba(5, 112, 176, 1)" }
      ],
      wind: [
        { stop: 0, color: "rgba(255, 255, 178, 0)" },
        { stop: 0.2, color: "rgba(254, 204, 92, 0.5)" },
        { stop: 0.5, color: "rgba(253, 141, 60, 0.75)" },
        { stop: 0.8, color: "rgba(240, 59, 32, 0.9)" },
        { stop: 1, color: "rgba(189, 0, 38, 1)" }
      ],
      temperature: [
        { stop: 0, color: "rgba(69, 117, 180, 0)" },
        { stop: 0.2, color: "rgba(116, 173, 209, 0.5)" },
        { stop: 0.5, color: "rgba(254, 224, 144, 0.75)" },
        { stop: 0.8, color: "rgba(244, 109, 67, 0.9)" },
        { stop: 1, color: "rgba(215, 48, 39, 1)" }
      ],
      clouds: [
        { stop: 0, color: "rgba(247, 247, 247, 0)" },
        { stop: 0.3, color: "rgba(204, 204, 204, 0.5)" },
        { stop: 0.7, color: "rgba(150, 150, 150, 0.75)" },
        { stop: 1, color: "rgba(82, 82, 82, 0.85)" }
      ],
      storm: [
        { stop: 0, color: "rgba(158, 1, 66, 0)" },
        { stop: 0.3, color: "rgba(213, 62, 79, 0.6)" },
        { stop: 0.6, color: "rgba(244, 109, 67, 0.8)" },
        { stop: 1, color: "rgba(254, 224, 139, 0.95)" }
      ]
    };

    const scheme = colorSchemes[layerName] || colorSchemes.temperature;
    
    for (let i = 0; i < scheme.length - 1; i++) {
      if (normalizedValue >= scheme[i].stop && normalizedValue <= scheme[i + 1].stop) {
        return scheme[i].color;
      }
    }
    
    return scheme[scheme.length - 1].color;
  };

  const getCircleColorAtValue = (layerName, normalizedValue) => {
    const colorSchemes = {
      rain: [
        "#1a1a1a", // Very dark (almost transparent effect)
        "#2166ac", 
        "#4393c3", 
        "#92c5de", 
        "#67a9cf",
        "#053470"
      ],
      wind: [
        "#2a2a2a",
        "#ffffb2", 
        "#fecc5c", 
        "#fd8d3c", 
        "#f03b20", 
        "#bd0026"
      ],
      temperature: [
        "#1a1a1a",
        "#4575b4", 
        "#74add1", 
        "#fee090", 
        "#f46d43", 
        "#d73027"
      ],
      clouds: [
        "#1a1a1a",
        "#f7f7f7", 
        "#cccccc", 
        "#969696", 
        "#525252"
      ],
      storm: [
        "#1a1a1a",
        "#9e0142", 
        "#d53e4f", 
        "#f46d43", 
        "#fee08b"
      ]
    };

    const colors = colorSchemes[layerName] || colorSchemes.temperature;
    const index = Math.floor(normalizedValue * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {showWindParticles && mapLoaded && country && (
        <WindParticleLayer
          map={map.current}
          country={country}
        />
      )}

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-lg text-sm shadow-lg">
        <div className="text-gray-400">
          Viewing:{" "}
          <span className="text-white font-semibold">
            {country?.name || "Select a country"}
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