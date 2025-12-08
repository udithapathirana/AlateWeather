import { createCanvas } from 'canvas';
import sharp from 'sharp';
import SphericalMercator from '@mapbox/sphericalmercator';
import { TILE_CONFIG } from '../config/tileConfig.js';
import { fetchWeatherForTile } from './weatherService.js';
import { interpolateColor } from '../utils/colorMapper.js';

const mercator = new SphericalMercator({ size: TILE_CONFIG.size });

export const generateTile = async (layer, zoom, x, y) => {
  const canvas = createCanvas(TILE_CONFIG.size, TILE_CONFIG.size);
  const ctx = canvas.getContext('2d');
  
  // Get tile bounds
  const bbox = mercator.bbox(x, y, zoom);
  const [west, south, east, north] = bbox;
  
  // Fetch weather data for this tile
  const weatherData = await fetchWeatherForTile(layer, { west, south, east, north }, zoom);
  
  // Draw heatmap
  const resolution = Math.max(8, 32 - zoom * 2);
  const stepLat = (north - south) / resolution;
  const stepLng = (east - west) / resolution;
  
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const lat = south + i * stepLat;
      const lng = west + j * stepLng;
      
      // Get weather value at this point
      const value = getWeatherValue(weatherData, lat, lng);
      
      if (value !== null) {
        // Map value to color
        const color = interpolateColor(value, TILE_CONFIG.layers[layer].colorStops);
        
        // Draw circle
        const pixelX = (j / resolution) * TILE_CONFIG.size;
        const pixelY = TILE_CONFIG.size - (i / resolution) * TILE_CONFIG.size;
        const radius = (TILE_CONFIG.size / resolution) * 0.8;
        
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Apply blur for smooth heatmap effect
  const imageData = ctx.getImageData(0, 0, TILE_CONFIG.size, TILE_CONFIG.size);
  const blurred = applyGaussianBlur(imageData, 3);
  ctx.putImageData(blurred, 0, 0);
  
  // Convert to PNG
  const buffer = canvas.toBuffer('image/png');
  
  // Optimize with sharp
  return await sharp(buffer)
    .png({ quality: 80, compressionLevel: 9 })
    .toBuffer();
};

function getWeatherValue(weatherData, lat, lng) {
  // Find nearest data point or interpolate
  if (!weatherData || weatherData.length === 0) return null;
  
  let nearest = weatherData[0];
  let minDist = distance(lat, lng, nearest.lat, nearest.lng);
  
  for (const point of weatherData) {
    const dist = distance(lat, lng, point.lat, point.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  }
  
  return nearest.value;
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function applyGaussianBlur(imageData, radius) {
  // Simple box blur implementation
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
            count++;
          }
        }
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = r / count;
      output[idx + 1] = g / count;
      output[idx + 2] = b / count;
      output[idx + 3] = a / count;
    }
  }
  
  return new ImageData(output, width, height);
}