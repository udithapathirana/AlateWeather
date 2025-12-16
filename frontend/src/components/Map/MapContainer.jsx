// frontend/src/components/Map/MapContainer.jsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import WindParticleLayer from './WindParticleLayer';
import { getGlobalWeatherLayer } from '../../services/api';

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
  const heatmapCanvases = useRef({});

  // Initialize map ONCE - never recreate
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20],
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

  // Navigate to country
  useEffect(() => {
    if (map.current && country) {
      map.current.flyTo({
        center: country.center,
        zoom: 5,
        duration: 2000
      });
    }
  }, [country]);

  // Load weather layers as HEATMAP + CIRCLES
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const loadLayers = async () => {
      console.log('Loading heatmap layers...');

      // Remove previous layers
      layerIds.current.forEach((sourceId) => {
        const heatmapLayerId = `${sourceId}-layer`;
        const circleLayerId = `${sourceId}-circle-layer`;
        
        if (map.current.getLayer(circleLayerId)) {
          map.current.removeLayer(circleLayerId);
        }
        if (map.current.getLayer(heatmapLayerId)) {
          map.current.removeLayer(heatmapLayerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });
      layerIds.current = [];

      const activeLayers = Object.entries(activeFilters).filter(([_, active]) => active);

      if (activeLayers.length === 0) {
        console.log('No active layers');
        return;
      }

      for (const [layerName] of activeLayers) {
        // Map "precipitation" to "rain" for API compatibility
        const apiLayerName = layerName === 'precipitation' ? 'rain' : layerName;
        const sourceId = `weather-${layerName}`;
        console.log(`Loading ${layerName} as heatmap + circles...`);

        try {
          const response = await getGlobalWeatherLayer(apiLayerName);
          const data = response.data;

          if (!data || data.length === 0) {
            console.warn(`No data for ${layerName}`);
            continue;
          }

          console.log(`✓ Loaded ${data.length} points for ${layerName}`);

          // Create heatmap features
          const features = data.map((point) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.lng, point.lat]
            },
            properties: {
              value: point.value,
              weight: normalizeValue(point.value, layerName)
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

            const heatmapLayerId = `${sourceId}-layer`;
            const circleLayerId = `${sourceId}-circle-layer`;
            
            // Add HEATMAP layer (visible at low zoom)
            map.current.addLayer({
              id: heatmapLayerId,
              type: "heatmap",
              source: sourceId,
              paint: {
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "weight"],
                  0, 0,
                  1, 1
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0, 0.8,
                  5, 1.2,
                  7, 1.5
                ],
                "heatmap-color": getHeatmapColorRamp(layerName),
                "heatmap-radius": [
                  "interpolate",
                  ["exponential", 2],
                  ["zoom"],
                  0, 40,
                  3, 50,
                  5, 60,
                  7, 70
                ],
                // Fade out heatmap as we zoom in
                "heatmap-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0, 0.8,
                  6, 0.6,
                  7, 0.3,
                  8, 0
                ]
              }
            });

            // Add CIRCLE layer (visible at high zoom)
            map.current.addLayer({
              id: circleLayerId,
              type: "circle",
              source: sourceId,
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7, 2,
                  9, 4,
                  11, 6,
                  13, 8
                ],
                "circle-color": getCircleColor(layerName),
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6, 0,
                  7, 0.3,
                  8, 0.7,
                  9, 0.85
                ],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.5
              }
            });
            
            layerIds.current.push(sourceId);
            console.log(`✓ Rendered ${layerName} with heatmap + circle layers`);
          }
        } catch (error) {
          console.error(`Failed to load ${layerName}:`, error);
        }
      }

      console.log('✓ All heatmap layers loaded');
    };

    loadLayers();
  }, [activeFilters, mapLoaded]);

  const normalizeValue = (value, layerName) => {
    const ranges = {
      temperature: { min: -10, max: 40 },
      rain: { min: 0, max: 100 },
      precipitation: { min: 0, max: 100 }, // Alias for rain
      wind: { min: 0, max: 45 },
      clouds: { min: 0, max: 100 },
      storm: { min: 0, max: 100 }
    };
    
    const range = ranges[layerName] || { min: 0, max: 100 };
    return Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  };

  const getHeatmapColorRamp = (layerName) => {
    const colorRamps = {
      rain: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.2, "rgba(33, 102, 172, 0.3)",
        0.4, "rgba(67, 147, 195, 0.5)",
        0.6, "rgba(146, 197, 222, 0.7)",
        0.8, "rgba(103, 169, 207, 0.8)",
        1, "rgba(5, 52, 112, 0.9)"
      ],
      precipitation: [ // Alias for rain
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.2, "rgba(33, 102, 172, 0.3)",
        0.4, "rgba(67, 147, 195, 0.5)",
        0.6, "rgba(146, 197, 222, 0.7)",
        0.8, "rgba(103, 169, 207, 0.8)",
        1, "rgba(5, 52, 112, 0.9)"
      ],
      wind: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.2, "rgba(255, 255, 178, 0.3)",
        0.4, "rgba(254, 204, 92, 0.5)",
        0.6, "rgba(253, 141, 60, 0.7)",
        0.8, "rgba(240, 59, 32, 0.8)",
        1, "rgba(189, 0, 38, 0.9)"
      ],
      temperature: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.2, "rgba(69, 117, 180, 0.3)",
        0.4, "rgba(116, 173, 209, 0.5)",
        0.5, "rgba(254, 224, 144, 0.6)",
        0.7, "rgba(244, 109, 67, 0.8)",
        1, "rgba(215, 48, 39, 0.9)"
      ],
      clouds: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.3, "rgba(247, 247, 247, 0.3)",
        0.5, "rgba(204, 204, 204, 0.5)",
        0.7, "rgba(150, 150, 150, 0.7)",
        1, "rgba(82, 82, 82, 0.8)"
      ],
      storm: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0, 0, 0, 0)",
        0.3, "rgba(158, 1, 66, 0.3)",
        0.5, "rgba(213, 62, 79, 0.5)",
        0.7, "rgba(244, 109, 67, 0.7)",
        1, "rgba(254, 224, 139, 0.9)"
      ]
    };

    return colorRamps[layerName] || colorRamps.temperature;
  };

  const getCircleColor = (layerName) => {
    // Color based on the normalized weight property
    const colorSchemes = {
      rain: [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#e0f3ff",
        0.3, "#4393c3",
        0.6, "#2166ac",
        1, "#053470"
      ],
      precipitation: [ // Alias for rain
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#e0f3ff",
        0.3, "#4393c3",
        0.6, "#2166ac",
        1, "#053470"
      ],
      wind: [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#ffffb2",
        0.3, "#fecc5c",
        0.6, "#fd8d3c",
        1, "#bd0026"
      ],
      temperature: [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#4575b4",
        0.3, "#74add1",
        0.5, "#fee090",
        0.7, "#f46d43",
        1, "#d73027"
      ],
      clouds: [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#f7f7f7",
        0.5, "#cccccc",
        1, "#525252"
      ],
      storm: [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        0, "#9e0142",
        0.5, "#d53e4f",
        1, "#fee08b"
      ]
    };

    return colorSchemes[layerName] || colorSchemes.temperature;
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Wind particles */}
      {mapLoaded && (
        <WindParticleLayer 
          map={map.current} 
          enabled={showWindParticles} 
        />
      )}

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