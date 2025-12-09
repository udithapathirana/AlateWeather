// backend/src/services/tileGenerator.js
// Simplified version without canvas/sharp dependencies

import { TILE_CONFIG } from '../config/tileConfig.js';
import { fetchWeatherForTile } from './weatherService.js';
import { interpolateColor } from '../utils/colorMapper.js';

// Simple tile generation without canvas
export const generateTile = async (layer, zoom, x, y) => {
  try {
    // Calculate tile bounds
    const n = Math.pow(2, zoom);
    const west = (x / n) * 360 - 180;
    const east = ((x + 1) / n) * 360 - 180;
    
    const latRad1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
    const north = latRad1 * 180 / Math.PI;
    const south = latRad2 * 180 / Math.PI;
    
    const bbox = { west, south, east, north };
    
    // Fetch weather data for this tile
    const weatherData = await fetchWeatherForTile(layer, bbox, zoom);
    
    // Generate JSON tile data (frontend will render)
    const tileData = {
      layer,
      zoom,
      x,
      y,
      bounds: bbox,
      data: weatherData.map(point => ({
        lat: parseFloat(point.lat.toFixed(4)),
        lng: parseFloat(point.lng.toFixed(4)),
        value: parseFloat(point.value.toFixed(2)),
        color: interpolateColor(point.value, TILE_CONFIG.layers[layer]?.colorStops || [])
      })),
      timestamp: new Date().toISOString()
    };
    
    // Return as JSON string
    return Buffer.from(JSON.stringify(tileData));
  } catch (error) {
    console.error('Error generating tile:', error);
    // Return empty tile
    return Buffer.from(JSON.stringify({ 
      layer, 
      zoom, 
      x, 
      y, 
      data: [], 
      error: error.message 
    }));
  }
};