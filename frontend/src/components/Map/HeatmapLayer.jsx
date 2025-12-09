// frontend/src/components/Map/HeatmapLayer.jsx
import { useEffect, useRef } from 'react';
import { getTileUrl } from '../../services/api';

const HeatmapLayer = ({ map, layer, opacity = 0.7, visible = true }) => {
  const sourceIdRef = useRef(`heatmap-${layer}`);
  const layerIdRef = useRef(`heatmap-layer-${layer}`);

  useEffect(() => {
    if (!map || !layer) return;

    const sourceId = sourceIdRef.current;
    const layerId = layerIdRef.current;

    // Add source if it doesn't exist
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [getTileUrl(layer, '{z}', '{x}', '{y}')],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 14
      });
    }

    // Add layer if it doesn't exist
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': opacity,
          'raster-opacity-transition': {
            duration: 300,
            delay: 0
          },
          'raster-fade-duration': 300
        }
      });
    }

    // Cleanup function
    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [map, layer]);

  // Update visibility
  useEffect(() => {
    if (!map) return;
    
    const layerId = layerIdRef.current;
    
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }
  }, [map, visible]);

  // Update opacity
  useEffect(() => {
    if (!map) return;
    
    const layerId = layerIdRef.current;
    
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  }, [map, opacity]);

  return null;
};

export default HeatmapLayer;