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

      // ⭐ DARK THEME MAP STYLE
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

  // Update weather layers - geojson heatmap layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !weatherData) return;

    // Remove previous layers
    layerIds.current.forEach((layerId) => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    layerIds.current = [];

    const activeLayers = Object.entries(activeFilters).filter(([_, active]) => active);

    activeLayers.forEach(([layerName]) => {
      if (!weatherData.layers || !weatherData.layers[layerName]) return;

      const sourceId = `weather-${layerName}`;
      const layerId = `weather-layer-${layerName}`;

      const features = weatherData.layers[layerName].map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.lng, point.lat]
        },
        properties: {
          value: point.value
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
      }

      if (!map.current.getLayer(layerId)) {
        map.current.addLayer({
          id: layerId,
          type: "heatmap",
          source: sourceId,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "value"],
              0,
              0,
              100,
              1
            ],
            "heatmap-intensity": 0.7,
            "heatmap-color": getHeatmapColor(layerName),
            "heatmap-radius": 30,
            "heatmap-opacity": 0.6
          }
        });
        layerIds.current.push(layerId);
      }
    });
  }, [activeFilters, weatherData, mapLoaded]);

  const getHeatmapColor = (layerName) => {
    const colors = {
      rain: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0,0,255,0)",
        0.2, "rgba(0,100,255,0.5)",
        0.4, "rgba(0,200,255,0.7)",
        0.6, "rgba(100,150,255,0.9)",
        1, "rgba(100,50,200,1)"
      ],
      wind: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(255,255,100,0)",
        0.2, "rgba(255,255,100,0.5)",
        0.4, "rgba(255,200,0,0.7)",
        0.6, "rgba(255,100,0,0.9)",
        1, "rgba(255,0,0,1)"
      ],
      temperature: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(0,0,255,0)",
        0.3, "rgba(0,255,255,0.6)",
        0.5, "rgba(0,255,0,0.7)",
        0.7, "rgba(255,255,0,0.8)",
        1, "rgba(255,0,0,1)"
      ],
      clouds: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(200,200,200,0)",
        0.5, "rgba(180,180,180,0.5)",
        1, "rgba(140,140,140,0.7)"
      ],
      storm: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0, "rgba(139,0,139,0)",
        0.5, "rgba(180,0,180,0.7)",
        1, "rgba(220,0,220,1)"
      ]
    };

    return colors[layerName] || colors.temperature;
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
