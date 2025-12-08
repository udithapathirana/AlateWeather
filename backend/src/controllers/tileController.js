import { generateTile } from '../services/tileGenerator.js';
import fs from 'fs/promises';
import path from 'path';
import { TILE_CONFIG } from '../config/tileConfig.js';

export const getTile = async (req, res) => {
  try {
    const { layer, z, x, y } = req.params;
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y);
    
    // Validate parameters
    if (zoom < TILE_CONFIG.minZoom || zoom > TILE_CONFIG.maxZoom) {
      return res.status(400).json({ error: 'Invalid zoom level' });
    }
    
    // Check if tile exists in cache
    const tilePath = path.join(
      TILE_CONFIG.cacheDir,
      layer,
      `${zoom}`,
      `${tileX}`,
      `${tileY}.png`
    );
    
    try {
      const tileData = await fs.readFile(tilePath);
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      return res.send(tileData);
    } catch (err) {
      // Tile not in cache, generate it
      console.log(`Generating tile: ${layer}/${zoom}/${tileX}/${tileY}`);
      const tile = await generateTile(layer, zoom, tileX, tileY);
      
      // Save to cache
      await fs.mkdir(path.dirname(tilePath), { recursive: true });
      await fs.writeFile(tilePath, tile);
      
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=300');
      return res.send(tile);
    }
  } catch (error) {
    console.error('Error serving tile:', error);
    res.status(500).json({ error: 'Failed to generate tile' });
  }
};

export const getTileMetadata = async (req, res) => {
  const { layer } = req.params;
  
  res.json({
    layer,
    tileSize: TILE_CONFIG.size,
    minZoom: TILE_CONFIG.minZoom,
    maxZoom: TILE_CONFIG.maxZoom,
    format: 'png',
    scheme: 'xyz'
  });
};