// frontend/src/components/Map/MapContainer.jsx
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import WindParticleLayer from './WindParticleLayer';
import { getTileUrl } from '../../services/api';

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
      center: country.center,
      zoom: 5,
      minZoom: 3,
      maxZoom: 14
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      if (onMapReady) onMapReady();
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

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
    if (!map.current || !mapLoaded) return;

    // Remove existing weather layers
    layerIds.current.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    layerIds.current = [];

    // Add active weather layers
    const layers = Object.entries(activeFilters).filter(([_, active]) => active);
    
    layers.forEach(([layerName, _], index) => {
      const sourceId = `weather-${layerName}`;
      const layerId = `weather-layer-${layerName}`;

      // Add raster source
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: 'raster',
          tiles: [
            getTileUrl(layerName, '{z}', '{x}', '{y}')
          ],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 14
        });
      }

      // Add raster layer
      if (!map.current.getLayer(layerId)) {
        map.current.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.7,
            'raster-fade-duration': 300
          }
        });

        layerIds.current.push(layerId);
      }
    });

  }, [activeFilters, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {showWindParticles && mapLoaded && (
        <WindParticleLayer 
          map={map.current}
          country={country}
          weatherData={weatherData}
        />
      )}

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-lg text-sm">
        <div className="text-gray-400">Viewing: <span className="text-white font-semibold">{country.name}</span></div>
        {timelineHour > 0 && (
          <div className="text-blue-400 mt-1">Forecast: +{timelineHour}h</div>
        )}
      </div>
    </div>
  );
};

export default MapContainer;