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
      // Generate grid points for this tile
      const gridSize = Math.max(5, 15 - zoom);
      const points = this.generateGridPoints(bounds, gridSize);
      
      // Fetch data for all points
      const weatherData = await Promise.all(
        points.map(point => this.fetchPointData(point, layer))
      );
      
      const filteredData = weatherData.filter(d => d !== null);
      cache.set(cacheKey, filteredData);
      
      return filteredData;
    } catch (error) {
      console.error('Error fetching weather data:', error.message);
      return this.generateFallbackData(bounds, layer, zoom);
    }
  }

  async fetchPointData(point, layer) {
    try {
      // Use Tomorrow.io API
      const response = await axios.get(`${this.baseUrl}/weather/realtime`, {
        params: {
          location: `${point.lat},${point.lng}`,
          apikey: this.tomorrowApiKey,
          fields: this.getFieldsForLayer(layer)
        },
        timeout: 5000
      });

      const data = response.data.data.values;
      
      return {
        lat: point.lat,
        lng: point.lng,
        value: this.extractValue(data, layer),
        windSpeed: data.windSpeed || 0,
        windDirection: data.windDirection || 0
      };
    } catch (error) {
      // Fallback to procedural generation
      return {
        lat: point.lat,
        lng: point.lng,
        value: this.generateProceduralValue(point.lat, point.lng, layer),
        windSpeed: Math.random() * 15,
        windDirection: Math.random() * 360
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

  generateGridPoints(bounds, gridSize) {
    const { west, south, east, north } = bounds;
    const points = [];
    const latStep = (north - south) / gridSize;
    const lngStep = (east - west) / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        points.push({
          lat: south + i * latStep,
          lng: west + j * lngStep
        });
      }
    }
    return points;
  }

  generateProceduralValue(lat, lng, layer) {
    const seed = lat * 0.01 + lng * 0.01;
    const noise = (s) => {
      const x = Math.sin(s * 12.9898 + s * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    switch (layer) {
      case 'rain':
        return noise(seed) * noise(seed * 2) * 20;
      case 'wind':
        return noise(seed * 1.5) * 30 + 5;
      case 'temperature':
        return noise(seed * 0.8) * 30 + 10;
      case 'clouds':
        return noise(seed * 1.2) * 100;
      case 'storm':
        return noise(seed * 3) > 0.8 ? noise(seed * 4) * 100 : 0;
      default:
        return 0;
    }
  }

  generateFallbackData(bounds, layer, zoom) {
    const gridSize = Math.max(5, 15 - zoom);
    const points = this.generateGridPoints(bounds, gridSize);
    
    return points.map(point => ({
      lat: point.lat,
      lng: point.lng,
      value: this.generateProceduralValue(point.lat, point.lng, layer),
      windSpeed: Math.random() * 15,
      windDirection: Math.random() * 360
    }));
  }

  async fetchCountryWeather(countryCode, layers) {
    const cacheKey = `country_${countryCode}_${layers.join('_')}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
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

      for (const layer of layers) {
        const gridPoints = this.generateGridPoints({
          west: coordinates.minLng,
          south: coordinates.minLat,
          east: coordinates.maxLng,
          north: coordinates.maxLat
        }, 20);

        const layerData = await Promise.all(
          gridPoints.slice(0, 50).map(point => this.fetchPointData(point, layer))
        );

        weatherData.layers[layer] = layerData.filter(d => d !== null);
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
}

export const fetchWeatherForTile = async (layer, bounds, zoom) => {
  const service = new WeatherService();
  return service.fetchWeatherForTile(layer, bounds, zoom);
};

export default new WeatherService();