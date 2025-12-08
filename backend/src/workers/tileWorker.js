// backend/src/workers/tileWorker.js
import { generateTile } from '../services/tileGenerator.js';
import { TILE_CONFIG, COUNTRIES } from '../config/tileConfig.js';
import fs from 'fs/promises';
import path from 'path';

const LAYERS = ['rain', 'wind', 'temperature', 'clouds', 'storm'];
let isGenerating = false;

export async function startTileGeneration(io) {
  console.log('🔄 Starting background tile generation...');
  
  // Generate tiles every 5 minutes
  setInterval(async () => {
    if (!isGenerating) {
      await generateTilesForAllCountries(io);
    }
  }, 300000);
  
  // Initial generation
  await generateTilesForAllCountries(io);
}

async function generateTilesForAllCountries(io) {
  isGenerating = true;
  console.log('🗺️  Generating tiles for all countries...');
  
  try {
    for (const [code, country] of Object.entries(COUNTRIES)) {
      console.log(`Generating tiles for ${country.name}...`);
      await generateCountryTiles(code, country, io);
    }
    
    console.log('✅ Tile generation complete');
    
    // Notify connected clients
    if (io) {
      io.emit('tiles-updated', {
        timestamp: new Date().toISOString(),
        message: 'New tiles available'
      });
    }
  } catch (error) {
    console.error('Error generating tiles:', error);
  } finally {
    isGenerating = false;
  }
}

async function generateCountryTiles(countryCode, country, io) {
  const { bounds } = country;
  
  // Generate tiles for each layer and zoom level
  for (const layer of LAYERS) {
    for (let zoom = TILE_CONFIG.minZoom; zoom <= Math.min(8, TILE_CONFIG.maxZoom); zoom++) {
      const tiles = getTilesForBounds(bounds, zoom);
      
      for (const tile of tiles) {
        try {
          const tilePath = path.join(
            TILE_CONFIG.cacheDir,
            layer,
            `${zoom}`,
            `${tile.x}`,
            `${tile.y}.png`
          );
          
          // Check if tile exists and is recent
          try {
            const stats = await fs.stat(tilePath);
            const age = Date.now() - stats.mtimeMs;
            if (age < 300000) continue; // Skip if less than 5 minutes old
          } catch {
            // Tile doesn't exist, generate it
          }
          
          const tileData = await generateTile(layer, zoom, tile.x, tile.y);
          
          await fs.mkdir(path.dirname(tilePath), { recursive: true });
          await fs.writeFile(tilePath, tileData);
          
          console.log(`Generated: ${layer}/${zoom}/${tile.x}/${tile.y}`);
        } catch (error) {
          console.error(`Error generating tile ${layer}/${zoom}/${tile.x}/${tile.y}:`, error.message);
        }
      }
    }
  }
}

function getTilesForBounds(bounds, zoom) {
  const tiles = [];
  const tileCount = Math.pow(2, zoom);
  
  const minTileX = Math.floor(((bounds.minLng + 180) / 360) * tileCount);
  const maxTileX = Math.floor(((bounds.maxLng + 180) / 360) * tileCount);
  const minTileY = Math.floor((1 - Math.log(Math.tan(bounds.maxLat * Math.PI / 180) + 1 / Math.cos(bounds.maxLat * Math.PI / 180)) / Math.PI) / 2 * tileCount);
  const maxTileY = Math.floor((1 - Math.log(Math.tan(bounds.minLat * Math.PI / 180) + 1 / Math.cos(bounds.minLat * Math.PI / 180)) / Math.PI) / 2 * tileCount);
  
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  
  return tiles;
}

// Manual trigger for tile generation
export async function regenerateAllTiles() {
  if (isGenerating) {
    console.log('Tile generation already in progress');
    return false;
  }
  
  await generateTilesForAllCountries(null);
  return true;
}