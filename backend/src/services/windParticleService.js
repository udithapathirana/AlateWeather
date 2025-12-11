// backend/src/services/windParticleService.js
import weatherService from './weatherService.js';

class WindParticleService {
  /**
   * Generate wind vector field for a given region
   * Now uses the global wind field from weatherService
   */
  async getWindVectorField(bounds, resolution = 50) {
    try {
      console.log(`Generating wind vector field: resolution=${resolution}`);
      
      // Get global wind field from weather service
      const globalWindField = await weatherService.getGlobalWindField();
      
      if (!globalWindField || !globalWindField.grid) {
        console.warn('No wind field data available, generating procedural');
        return this.generateProceduralVectorField(bounds, resolution);
      }

      // Extract the requested region from global field
      const { grid, gridSize, latMin, latMax, lngMin, lngMax } = globalWindField;
      const vectorField = [];

      const latStep = (bounds.north - bounds.south) / resolution;
      const lngStep = (bounds.east - bounds.west) / resolution;

      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const lat = bounds.south + i * latStep;
          const lng = bounds.west + j * lngStep;

          // Get wind from global grid using interpolation
          const wind = this.getWindFromGlobalGrid(lat, lng, grid, gridSize, latMin, latMax, lngMin, lngMax);

          vectorField.push({
            lat: parseFloat(lat.toFixed(4)),
            lng: parseFloat(lng.toFixed(4)),
            u: parseFloat(wind.u.toFixed(3)),
            v: parseFloat(wind.v.toFixed(3)),
            speed: parseFloat(Math.sqrt(wind.u * wind.u + wind.v * wind.v).toFixed(2)),
            direction: parseFloat(((Math.atan2(wind.v, wind.u) * 180 / Math.PI + 360) % 360).toFixed(1))
          });
        }
      }

      console.log(`Generated ${vectorField.length} wind vectors from global field`);

      return {
        bounds,
        resolution,
        vectors: vectorField,
        timestamp: new Date().toISOString(),
        dataSource: 'global_wind_field'
      };
    } catch (error) {
      console.error('Error generating wind vector field:', error);
      return this.generateProceduralVectorField(bounds, resolution);
    }
  }

  /**
   * Get wind at specific point from global grid using bilinear interpolation
   */
  getWindFromGlobalGrid(lat, lng, grid, gridSize, latMin, latMax, lngMin, lngMax) {
    // Normalize to grid coordinates
    let x = ((lng - lngMin) / (lngMax - lngMin)) * gridSize;
    let y = ((lat - latMin) / (latMax - latMin)) * gridSize;

    // Clamp
    x = Math.max(0, Math.min(gridSize - 0.001, x));
    y = Math.max(0, Math.min(gridSize - 0.001, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, gridSize);
    const y1 = Math.min(y0 + 1, gridSize);

    const dx = x - x0;
    const dy = y - y0;

    // Bilinear interpolation
    const v00 = grid[y0][x0];
    const v10 = grid[y0][x1];
    const v01 = grid[y1][x0];
    const v11 = grid[y1][x1];

    const u = v00.u * (1 - dx) * (1 - dy) +
              v10.u * dx * (1 - dy) +
              v01.u * (1 - dx) * dy +
              v11.u * dx * dy;

    const v = v00.v * (1 - dx) * (1 - dy) +
              v10.v * dx * (1 - dy) +
              v01.v * (1 - dx) * dy +
              v11.v * dx * dy;

    return { u, v };
  }

  /**
   * Generate procedural wind vector field (fallback)
   */
  generateProceduralVectorField(bounds, resolution) {
    console.log('Generating procedural wind vector field');
    
    const { west, south, east, north } = bounds;
    const latStep = (north - south) / resolution;
    const lngStep = (east - west) / resolution;
    
    const vectors = [];
    
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const lat = south + i * latStep;
        const lng = west + j * lngStep;
        
        const seed = lat * 0.01 + lng * 0.01;
        const seed2 = lat * 0.02 - lng * 0.015;
        
        const noise1 = Math.sin(seed * 10) * Math.cos(seed * 8);
        const noise2 = Math.sin(seed * 12) * Math.cos(seed * 6);
        const noise3 = Math.sin(seed2 * 15) * Math.cos(seed2 * 9);
        
        const baseSpeed = 5 + Math.abs(noise1 * 10);
        const speedVariation = Math.abs(noise2 * 5);
        const speed = baseSpeed + speedVariation;
        
        const baseDirection = ((noise2 + 1) * 180) % 360;
        const directionVariation = noise3 * 30;
        const direction = (baseDirection + directionVariation + 360) % 360;
        
        const radians = direction * (Math.PI / 180);
        const u = speed * Math.cos(radians);
        const v = speed * Math.sin(radians);
        
        vectors.push({
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4)),
          u: parseFloat(u.toFixed(3)),
          v: parseFloat(v.toFixed(3)),
          speed: parseFloat(speed.toFixed(2)),
          direction: parseFloat(direction.toFixed(1))
        });
      }
    }
    
    return {
      bounds,
      resolution,
      vectors,
      timestamp: new Date().toISOString(),
      dataSource: 'procedural'
    };
  }

  /**
   * Convert wind speed and direction to U and V components
   */
  windToComponents(speed, direction) {
    const radians = ((270 - direction) % 360) * (Math.PI / 180);
    
    return {
      u: speed * Math.cos(radians),
      v: speed * Math.sin(radians)
    };
  }

  /**
   * Convert U and V components back to speed and direction
   */
  componentsToWind(u, v) {
    const speed = Math.sqrt(u * u + v * v);
    let direction = (270 - Math.atan2(v, u) * (180 / Math.PI)) % 360;
    if (direction < 0) direction += 360;
    
    return { speed, direction };
  }
}

export default new WindParticleService();