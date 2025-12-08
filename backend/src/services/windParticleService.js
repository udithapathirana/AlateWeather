// backend/src/services/windParticleService.js
import weatherService from './weatherService.js';

class WindParticleService {
  /**
   * Generate wind vector field for a given region
   * @param {Object} bounds - {west, south, east, north}
   * @param {Number} resolution - Grid resolution (default: 50)
   * @returns {Object} Wind vector field data
   */
  async getWindVectorField(bounds, resolution = 50) {
    try {
      console.log(`Generating wind vector field: resolution=${resolution}`);
      
      // Fetch weather data with wind information
      const weatherData = await weatherService.fetchWeatherForTile('wind', bounds, 8);
      
      if (!weatherData || weatherData.length === 0) {
        console.warn('No weather data available, generating procedural wind field');
        return this.generateProceduralVectorField(bounds, resolution);
      }
      
      // Create a uniform grid
      const { west, south, east, north } = bounds;
      const latStep = (north - south) / resolution;
      const lngStep = (east - west) / resolution;
      
      const vectorField = [];
      
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const lat = south + i * latStep;
          const lng = west + j * lngStep;
          
          // Find nearest weather data point or interpolate
          const windData = this.interpolateWindAtPoint(weatherData, lat, lng);
          
          if (windData) {
            // Convert wind speed and direction to U and V components
            const { u, v } = this.windToComponents(
              windData.speed,
              windData.direction
            );
            
            vectorField.push({
              lat: parseFloat(lat.toFixed(4)),
              lng: parseFloat(lng.toFixed(4)),
              u: parseFloat(u.toFixed(3)),
              v: parseFloat(v.toFixed(3)),
              speed: parseFloat(windData.speed.toFixed(2)),
              direction: parseFloat(windData.direction.toFixed(1))
            });
          }
        }
      }
      
      console.log(`Generated ${vectorField.length} wind vectors`);
      
      return {
        bounds,
        resolution,
        vectors: vectorField,
        timestamp: new Date().toISOString(),
        dataSource: 'api'
      };
    } catch (error) {
      console.error('Error generating wind vector field:', error);
      return this.generateProceduralVectorField(bounds, resolution);
    }
  }

  /**
   * Convert wind speed and direction to U and V components
   * @param {Number} speed - Wind speed in m/s
   * @param {Number} direction - Direction in degrees (meteorological convention)
   * @returns {Object} {u, v} components
   */
  windToComponents(speed, direction) {
    // Convert meteorological wind direction to mathematical convention
    // Meteorological: direction wind is coming FROM, measured clockwise from north
    // Mathematical: convert to radians for standard trig functions
    const radians = ((270 - direction) % 360) * (Math.PI / 180);
    
    return {
      u: speed * Math.cos(radians),
      v: speed * Math.sin(radians)
    };
  }

  /**
   * Convert U and V components back to speed and direction
   * @param {Number} u - U component (east-west)
   * @param {Number} v - V component (north-south)
   * @returns {Object} {speed, direction}
   */
  componentsToWind(u, v) {
    const speed = Math.sqrt(u * u + v * v);
    let direction = (270 - Math.atan2(v, u) * (180 / Math.PI)) % 360;
    if (direction < 0) direction += 360;
    
    return { speed, direction };
  }

  /**
   * Interpolate wind data at a specific point
   * @param {Array} weatherData - Array of weather data points
   * @param {Number} lat - Target latitude
   * @param {Number} lng - Target longitude
   * @returns {Object} Interpolated wind data
   */
  interpolateWindAtPoint(weatherData, lat, lng) {
    if (!weatherData || weatherData.length === 0) return null;
    
    // Find the 4 nearest points for bilinear interpolation
    const nearest = weatherData
      .map(d => ({
        ...d,
        distance: this.distance(lat, lng, d.lat, d.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
    
    if (nearest.length === 0) return null;
    
    // If very close to a point, use it directly
    if (nearest[0].distance < 0.001) {
      return {
        speed: nearest[0].windSpeed || nearest[0].value || 0,
        direction: nearest[0].windDirection || 0
      };
    }
    
    // Inverse distance weighting
    const totalWeight = nearest.reduce((sum, p) => sum + (1 / (p.distance + 0.001)), 0);
    
    let speedSum = 0;
    let uSum = 0;
    let vSum = 0;
    
    for (const point of nearest) {
      const weight = (1 / (point.distance + 0.001)) / totalWeight;
      const speed = point.windSpeed || point.value || 0;
      const direction = point.windDirection || 0;
      
      // Convert to components for proper averaging
      const { u, v } = this.windToComponents(speed, direction);
      
      uSum += u * weight;
      vSum += v * weight;
      speedSum += speed * weight;
    }
    
    // Convert back to speed and direction
    const { speed, direction } = this.componentsToWind(uSum, vSum);
    
    return { speed, direction };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {Number} lat1 - Latitude of point 1
   * @param {Number} lon1 - Longitude of point 1
   * @param {Number} lat2 - Latitude of point 2
   * @param {Number} lon2 - Longitude of point 2
   * @returns {Number} Distance in kilometers
   */
  distance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Generate procedural wind vector field (fallback when no API data)
   * @param {Object} bounds - Region bounds
   * @param {Number} resolution - Grid resolution
   * @returns {Object} Procedural wind vector field
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
        
        // Generate procedural wind pattern using multiple noise functions
        const seed = lat * 0.01 + lng * 0.01;
        const seed2 = lat * 0.02 - lng * 0.015;
        
        // Create flowing patterns
        const noise1 = Math.sin(seed * 10) * Math.cos(seed * 8);
        const noise2 = Math.sin(seed * 12) * Math.cos(seed * 6);
        const noise3 = Math.sin(seed2 * 15) * Math.cos(seed2 * 9);
        
        // Combine noise functions for realistic wind patterns
        const baseSpeed = 5 + Math.abs(noise1 * 10);
        const speedVariation = Math.abs(noise2 * 5);
        const speed = baseSpeed + speedVariation;
        
        // Direction with some flow and variation
        const baseDirection = ((noise2 + 1) * 180) % 360;
        const directionVariation = noise3 * 30;
        const direction = (baseDirection + directionVariation + 360) % 360;
        
        const { u, v } = this.windToComponents(speed, direction);
        
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
   * Smooth wind vector field to reduce noise
   * @param {Array} vectors - Array of wind vectors
   * @param {Number} kernelSize - Smoothing kernel size
   * @returns {Array} Smoothed vectors
   */
  smoothVectorField(vectors, kernelSize = 3) {
    // Apply Gaussian smoothing to wind vectors
    const smoothed = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const neighbors = this.getNeighborVectors(vectors, i, kernelSize);
      
      let uSum = 0, vSum = 0, count = 0;
      
      for (const neighbor of neighbors) {
        uSum += neighbor.u;
        vSum += neighbor.v;
        count++;
      }
      
      const { speed, direction } = this.componentsToWind(
        uSum / count,
        vSum / count
      );
      
      smoothed.push({
        ...vectors[i],
        u: uSum / count,
        v: vSum / count,
        speed,
        direction
      });
    }
    
    return smoothed;
  }

  /**
   * Get neighboring vectors for smoothing
   * @param {Array} vectors - All vectors
   * @param {Number} index - Current vector index
   * @param {Number} radius - Neighbor radius
   * @returns {Array} Neighboring vectors
   */
  getNeighborVectors(vectors, index, radius) {
    const current = vectors[index];
    const neighbors = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const dist = this.distance(
        current.lat, current.lng,
        vectors[i].lat, vectors[i].lng
      );
      
      if (dist <= radius) {
        neighbors.push(vectors[i]);
      }
    }
    
    return neighbors;
  }
}

export default new WindParticleService();