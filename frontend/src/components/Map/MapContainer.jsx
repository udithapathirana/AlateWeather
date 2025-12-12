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
  }, []); // Empty deps - only create once

  // Navigate to country (separate effect)
  useEffect(() => {
    if (map.current && country) {
      map.current.flyTo({
        center: country.center,
        zoom: 5,
        duration: 2000
      });
    }
  }, [country]);

  // Load weather layers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const loadLayers = async () => {
      console.log('Loading layers...');

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
        console.log('No active layers');
        return;
      }

      for (const [layerName] of activeLayers) {
        const sourceId = `weather-${layerName}`;
        console.log(`Loading ${layerName}...`);

        try {
          const response = await getGlobalWeatherLayer(layerName);
          const data = response.data;

          if (!data || data.length === 0) {
            console.warn(`No data for ${layerName}`);
            continue;
          }

          console.log(`✓ Loaded ${data.length} points for ${layerName}`);

          const features = data.map((point) => ({
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
            console.log(`✓ Rendered ${layerName}`);
          }
        } catch (error) {
          console.error(`Failed to load ${layerName}:`, error);
        }
      }

      console.log('✓ All layers loaded');
    };

    loadLayers();
  }, [activeFilters, mapLoaded]);

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

      {/* Always render WindParticleLayer, control with enabled prop */}
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