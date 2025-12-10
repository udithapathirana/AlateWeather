// backend/src/services/weatherService.js
import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 1800 });

class WeatherService {
  constructor() {
    this.tomorrowApiKey = process.env.TOMORROW_API_KEY;
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.tomorrow.io/v4';
  }

  async fetchWeatherForTile(layer, bounds, zoom) {
    const cacheKey = `tile_${layer}_${bounds.west}_${bounds.south}_${zoom}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Generate DENSE grid points for complete coverage
      const gridSize = Math.max(20, 30 - zoom * 2); // 20-30 points per dimension
      const points = this.generateDenseGridPoints(bounds, gridSize);
      
      console.log(`Generating ${points.length} weather points for ${layer}`);
      
      // Generate procedural data (API calls would be too slow for this many points)
      const weatherData = points.map(point => ({
        ...point,
        ...this.generateRealisticWeather(point.lat, point.lng, layer)
      }));
      
      cache.set(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error.message);
      return this.generateFallbackData(bounds, layer, zoom);
    }
  }

  generateDenseGridPoints(bounds, gridSize) {
    const { west, south, east, north } = bounds;
    const points = [];
    const latStep = (north - south) / gridSize;
    const lngStep = (east - west) / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        points.push({
          lat: parseFloat((south + i * latStep).toFixed(5)),
          lng: parseFloat((west + j * lngStep).toFixed(5))
        });
      }
    }
    return points;
  }

  generateRealisticWeather(lat, lng, layer) {
    // Use multiple noise functions for realistic patterns
    const seed1 = lat * 0.1 + lng * 0.1;
    const seed2 = lat * 0.05 + lng * 0.15;
    const seed3 = lat * 0.15 + lng * 0.05;
    
    const noise1 = Math.sin(seed1 * 10) * Math.cos(seed1 * 8);
    const noise2 = Math.sin(seed2 * 12) * Math.cos(seed2 * 6);
    const noise3 = Math.sin(seed3 * 8) * Math.cos(seed3 * 10);
    const combined = (noise1 + noise2 + noise3) / 3;

    let value, windSpeed, windDirection;

    switch (layer) {
      case 'rain':
        // Rain: 0-50mm with realistic patches
        value = Math.max(0, (combined + 1) * 25 + Math.abs(noise3) * 25);
        windSpeed = 5 + Math.abs(noise1 * 15);
        windDirection = ((noise2 + 1) * 180) % 360;
        break;
        
      case 'wind':
        // Wind: 5-45 km/h
        value = Math.abs(combined * 20) + 15 + Math.abs(noise2 * 10);
        windSpeed = value;
        windDirection = ((noise1 + 1) * 180) % 360;
        break;
        
      case 'temperature':
        // Temperature: 5-35°C with smooth gradients
        value = 20 + (combined * 15) + (lat * 0.1); // Latitude affects temp
        windSpeed = 5 + Math.abs(noise1 * 10);
        windDirection = ((noise2 + 1) * 180) % 360;
        break;
        
      case 'clouds':
        // Clouds: 0-100%
        value = Math.max(0, Math.min(100, (combined + 1) * 50 + noise2 * 25));
        windSpeed = 5 + Math.abs(noise1 * 10);
        windDirection = ((noise2 + 1) * 180) % 360;
        break;
        
      case 'storm':
        // Storm: Patches of high intensity
        const stormThreshold = 0.5;
        if (combined > stormThreshold) {
          value = 60 + Math.abs(combined * 40);
        } else {
          value = Math.abs(combined * 30);
        }
        windSpeed = value * 0.8; // High wind in storms
        windDirection = ((noise1 + 1) * 180) % 360;
        break;
        
      default:
        value = (combined + 1) * 50;
        windSpeed = Math.abs(noise1 * 15);
        windDirection = ((noise2 + 1) * 180) % 360;
    }

    return {
      value: parseFloat(value.toFixed(2)),
      windSpeed: parseFloat(windSpeed.toFixed(2)),
      windDirection: parseFloat(windDirection.toFixed(1))
    };
  }

  generateFallbackData(bounds, layer, zoom) {
    const gridSize = Math.max(20, 30 - zoom * 2);
    const points = this.generateDenseGridPoints(bounds, gridSize);
    
    return points.map(point => ({
      ...point,
      ...this.generateRealisticWeather(point.lat, point.lng, layer)
    }));
  }

  async fetchCountryWeather(countryCode, layers) {
    const cacheKey = `country_${countryCode}_${layers.join('_')}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    try {
      const coordinates = this.getCountryCoordinates(countryCode);
      const weatherData = {
        country: countryCode,
        coordinates,
        layers: {},
        timestamp: new Date().toISOString()
      };

      console.log(`Fetching weather for ${countryCode}, layers: ${layers.join(', ')}`);

      for (const layer of layers) {
        // Generate dense grid for each layer
        const bounds = {
          west: coordinates.minLng,
          south: coordinates.minLat,
          east: coordinates.maxLng,
          north: coordinates.maxLat
        };
        
        const gridSize = 30; // 30x30 = 900 points per layer
        const gridPoints = this.generateDenseGridPoints(bounds, gridSize);
        
        const layerData = gridPoints.map(point => ({
          ...point,
          ...this.generateRealisticWeather(point.lat, point.lng, layer)
        }));

        weatherData.layers[layer] = layerData;
        console.log(`Generated ${layerData.length} points for ${layer}`);
      }

      cache.set(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error('Error fetching country weather:', error);
      throw error;
    }
  }

  getCountryCoordinates(countryCode) {
    const countries = {
      US: { minLat: 25, maxLat: 49, minLng: -125, maxLng: -66 },
      GB: { minLat: 50, maxLat: 59, minLng: -8, maxLng: 2 },
      AU: { minLat: -44, maxLat: -10, minLng: 113, maxLng: 154 },
      JP: { minLat: 24, maxLat: 46, minLng: 123, maxLng: 146 },
      BR: { minLat: -34, maxLat: 5, minLng: -74, maxLng: -34 },
      IN: { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 },
      DE: { minLat: 47, maxLat: 55, minLng: 6, maxLng: 15 },
      CA: { minLat: 42, maxLat: 70, minLng: -141, maxLng: -52 }
    };
    return countries[countryCode] || countries.US;
  }

  async fetchPointData(point, layer) {
    try {
      // For production: uncomment to use real API
      // const response = await axios.get(`${this.baseUrl}/weather/realtime`, {
      //   params: {
      //     location: `${point.lat},${point.lng}`,
      //     apikey: this.tomorrowApiKey,
      //     fields: this.getFieldsForLayer(layer)
      //   },
      //   timeout: 5000
      // });
      // const data = response.data.data.values;
      
      // For now: use procedural generation
      return {
        lat: point.lat,
        lng: point.lng,
        ...this.generateRealisticWeather(point.lat, point.lng, layer)
      };
    } catch (error) {
      return {
        lat: point.lat,
        lng: point.lng,
        ...this.generateRealisticWeather(point.lat, point.lng, layer)
      };
    }
  }

  getFieldsForLayer(layer) {
    const fieldMap = {
      rain: 'precipitationIntensity,precipitationType',
      wind: 'windSpeed,windDirection,windGust',
      temperature: 'temperature,temperatureApparent',
      clouds: 'cloudCover,cloudBase,cloudCeiling',
      storm: 'precipitationIntensity,windSpeed,windGust,lightning'
    };
    return fieldMap[layer] || 'temperature';
  }

  extractValue(data, layer) {
    switch (layer) {
      case 'rain':
        return data.precipitationIntensity || 0;
      case 'wind':
        return data.windSpeed || 0;
      case 'temperature':
        return data.temperature || 0;
      case 'clouds':
        return data.cloudCover || 0;
      case 'storm':
        const precip = data.precipitationIntensity || 0;
        const wind = data.windSpeed || 0;
        const lightning = data.lightning || 0;
        return (precip * 10 + wind * 2 + lightning * 20);
      default:
        return 0;
    }
  }
}

export const fetchWeatherForTile = async (layer, bounds, zoom) => {
  const service = new WeatherService();
  return service.fetchWeatherForTile(layer, bounds, zoom);
};

export default new WeatherService();