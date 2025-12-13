// backend/src/services/weatherService.js
import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

class WeatherService {
  constructor() {
    // Use OpenWeather for free global data
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || '6dbda6574cef7b6093a92d6b4b570126';
    this.openWeatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Fetch REAL global weather data from OpenWeatherMap
   * This fetches actual current weather for a grid of points
   */
  async fetchGlobalWeatherData(layer) {
    const cacheKey = `global_${layer}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for global ${layer}`);
      return cached;
    }

    console.log(`Fetching REAL global ${layer} data from API...`);

    try {
      const points = [];
      const gridSize = 30; // 30x30 = 900 API calls (use wisely!)
      
      const latStep = 170 / gridSize; // -85 to 85
      const lngStep = 360 / gridSize; // -180 to 180

      // Batch API requests
      const requests = [];
      const positions = [];

      for (let i = 0; i <= gridSize; i += 2) { // Skip some to reduce API calls
        for (let j = 0; j <= gridSize; j += 2) {
          const lat = -85 + i * latStep;
          const lng = -180 + j * lngStep;
          
          positions.push({ lat, lng });
          requests.push(this.fetchPointWeather(lat, lng));
        }
      }

      // Execute all requests in parallel (be careful with rate limits!)
      const results = await Promise.allSettled(requests);

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const data = result.value;
          const pos = positions[idx];
          
          points.push({
            lat: parseFloat(pos.lat.toFixed(4)),
            lng: parseFloat(pos.lng.toFixed(4)),
            value: this.extractValue(data, layer),
            windSpeed: data.wind?.speed || 0,
            windDirection: data.wind?.deg || 0,
            temperature: data.main?.temp || 0,
            humidity: data.main?.humidity || 0,
            pressure: data.main?.pressure || 0,
            clouds: data.clouds?.all || 0,
            rain: data.rain?.['1h'] || 0
          });
        }
      });

      console.log(`✓ Fetched ${points.length} real data points for ${layer}`);

      // Interpolate to fill gaps
      const interpolated = this.interpolateGlobalData(points, layer);
      
      cache.set(cacheKey, interpolated);
      return interpolated;

    } catch (error) {
      console.error('Error fetching global weather:', error.message);
      // Fallback to procedural only if API fails
      return this.generateFallbackData(layer);
    }
  }

  /**
   * Fetch weather for a single point from OpenWeatherMap
   */
  async fetchPointWeather(lat, lng) {
    try {
      const response = await axios.get(`${this.openWeatherBaseUrl}/weather`, {
        params: {
          lat,
          lon: lng,
          appid: this.openWeatherApiKey,
          units: 'metric'
        },
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      // Silent fail for individual points
      return null;
    }
  }

  /**
   * Extract value for specific layer from API response
   */
  extractValue(data, layer) {
    if (!data) return 0;

    switch (layer) {
      case 'temperature':
        return data.main?.temp || 15;
      
      case 'rain':
        return (data.rain?.['1h'] || 0) + (data.rain?.['3h'] || 0) / 3;
      
      case 'wind':
        return data.wind?.speed || 0;
      
      case 'clouds':
        return data.clouds?.all || 0;
      
      case 'storm':
        const rain = (data.rain?.['1h'] || 0);
        const wind = data.wind?.speed || 0;
        const clouds = data.clouds?.all || 0;
        return Math.min(100, rain * 5 + wind * 2 + clouds * 0.3);
      
      default:
        return 0;
    }
  }

  /**
   * Interpolate sparse API data to create smooth coverage
   */
  interpolateGlobalData(points, layer) {
    if (points.length === 0) {
      return this.generateFallbackData(layer);
    }

    const interpolated = [];
    const gridSize = 60; // Output resolution
    
    const latStep = 170 / gridSize;
    const lngStep = 360 / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lat = -85 + i * latStep;
        const lng = -180 + j * lngStep;

        // Find nearest data points for interpolation
        const nearest = points
          .map(p => ({
            ...p,
            distance: Math.sqrt(
              Math.pow(p.lat - lat, 2) + 
              Math.pow(p.lng - lng, 2)
            )
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4); // Use 4 nearest points

        if (nearest.length === 0) continue;

        // Inverse distance weighting
        let sumValue = 0;
        let sumWeight = 0;
        let sumWindU = 0;
        let sumWindV = 0;

        nearest.forEach(point => {
          const weight = 1 / (point.distance + 0.1);
          sumValue += point.value * weight;
          
          // Convert wind to U/V components
          const radians = (point.windDirection * Math.PI) / 180;
          const u = point.windSpeed * Math.cos(radians);
          const v = point.windSpeed * Math.sin(radians);
          
          sumWindU += u * weight;
          sumWindV += v * weight;
          sumWeight += weight;
        });

        interpolated.push({
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4)),
          value: parseFloat((sumValue / sumWeight).toFixed(2)),
          windU: parseFloat((sumWindU / sumWeight).toFixed(2)),
          windV: parseFloat((sumWindV / sumWeight).toFixed(2)),
          windSpeed: Math.sqrt(
            Math.pow(sumWindU / sumWeight, 2) + 
            Math.pow(sumWindV / sumWeight, 2)
          ),
          windDirection: Math.atan2(sumWindV / sumWeight, sumWindU / sumWeight) * (180 / Math.PI)
        });
      }
    }

    console.log(`✓ Interpolated to ${interpolated.length} points`);
    return interpolated;
  }

  /**
   * Get REAL wind vector field for the entire globe
   */
  async getGlobalWindField() {
    const cacheKey = 'global_wind_field';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit for global wind field');
      return cached;
    }

    console.log('Fetching REAL global wind field...');

    try {
      // Fetch wind data
      const windData = await this.fetchGlobalWeatherData('wind');
      
      // Build grid
      const gridSize = 60;
      const grid = [];
      
      const latStep = 170 / gridSize;
      const lngStep = 360 / gridSize;

      for (let y = 0; y <= gridSize; y++) {
        const row = [];
        const lat = -85 + y * latStep;
        
        for (let x = 0; x <= gridSize; x++) {
          const lng = -180 + x * lngStep;

          // Find nearest wind data point
          const nearest = windData
            .map(p => ({
              ...p,
              distance: Math.sqrt(
                Math.pow(p.lat - lat, 2) + 
                Math.pow(p.lng - lng, 2)
              )
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 4);

          if (nearest.length === 0) {
            row.push({ u: 0, v: 0 });
            continue;
          }

          // Inverse distance weighting
          let sumU = 0, sumV = 0, sumW = 0;

          nearest.forEach(point => {
            const weight = 1 / (point.distance + 0.1);
            sumU += (point.windU || 0) * weight;
            sumV += (point.windV || 0) * weight;
            sumW += weight;
          });

          row.push({
            u: sumU / sumW,
            v: sumV / sumW
          });
        }
        grid.push(row);
      }

      const windField = {
        grid,
        gridSize,
        latMin: -85,
        latMax: 85,
        lngMin: -180,
        lngMax: 180,
        timestamp: new Date().toISOString()
      };

      cache.set(cacheKey, windField);
      console.log('✓ Global wind field ready');
      return windField;

    } catch (error) {
      console.error('Error fetching wind field:', error.message);
      return this.generateFallbackWindField();
    }
  }

  /**
   * Fallback data generation (only used if API fails)
   */
  generateFallbackData(layer) {
    console.warn(`Using fallback procedural data for ${layer}`);
    
    const points = [];
    const gridSize = 40;
    const latStep = 170 / gridSize;
    const lngStep = 360 / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lat = -85 + i * latStep;
        const lng = -180 + j * lngStep;

        const seed = lat * 0.05 + lng * 0.05;
        const noise = (Math.sin(seed * 15) * Math.cos(seed * 12) + 1) * 0.5;
        const latFactor = layer === 'temperature' 
          ? Math.cos((lat * Math.PI) / 180) * 0.5 + 0.5
          : 0.5;

        const combined = noise * 0.7 + latFactor * 0.3;

        let value;
        switch(layer) {
          case 'temperature':
            value = -10 + combined * 50;
            break;
          case 'rain':
            value = combined * 100;
            break;
          case 'wind':
            value = 5 + combined * 40;
            break;
          case 'clouds':
            value = combined * 100;
            break;
          case 'storm':
            value = combined > 0.7 ? combined * 100 : combined * 25;
            break;
          default:
            value = combined * 100;
        }

        points.push({
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4)),
          value: parseFloat(value.toFixed(2)),
          windU: 0,
          windV: 0
        });
      }
    }

    return points;
  }

  generateFallbackWindField() {
    console.warn('Using fallback procedural wind field');
    
    const gridSize = 60;
    const grid = [];
    const latStep = 170 / gridSize;
    const lngStep = 360 / gridSize;

    for (let y = 0; y <= gridSize; y++) {
      const row = [];
      const lat = -85 + y * latStep;
      
      for (let x = 0; x <= gridSize; x++) {
        const lng = -180 + x * lngStep;

        const latRad = (lat * Math.PI) / 180;
        const absLat = Math.abs(lat);
        
        let u, v;
        if (absLat < 30) {
          u = -10;
          v = 0;
        } else if (absLat < 60) {
          u = 15;
          v = 0;
        } else {
          u = -8;
          v = 0;
        }

        const s = lat * 0.05 + lng * 0.05;
        const noise = Math.sin(s * 8) * Math.cos(s * 6);
        
        row.push({ u: u + noise * 5, v: v + noise * 3 });
      }
      grid.push(row);
    }

    return {
      grid,
      gridSize,
      latMin: -85,
      latMax: 85,
      lngMin: -180,
      lngMax: 180,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Legacy method for compatibility
   */
  async fetchCountryWeather(countryCode, layers) {
    console.log(`Fetching weather for ${countryCode}`);
    
    const weatherData = {
      country: countryCode,
      layers: {},
      timestamp: new Date().toISOString()
    };

    for (const layer of layers) {
      weatherData.layers[layer] = await this.fetchGlobalWeatherData(layer);
    }

    return weatherData;
  }
}

export default new WeatherService();