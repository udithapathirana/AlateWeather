// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export const weatherAPI = {
  getCountryWeather: async (countryCode, layers) => {
    const layersParam = layers.join(',');
    const response = await api.get(`/weather/country/${countryCode}?layers=${layersParam}`);
    return response.data;
  },

  getHeatmapData: async (bounds, zoom, layer) => {
    const boundsParam = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
    const response = await api.get(`/weather/heatmap`, {
      params: {
        bounds: boundsParam,
        zoom,
        layer
      }
    });
    return response.data;
  },

  getWindVectors: async (bounds, resolution = 50) => {
    const boundsParam = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
    const response = await api.get(`/weather/wind-vectors`, {
      params: {
        bounds: boundsParam,
        resolution
      }
    });
    return response.data;
  },

  getAvailableLayers: async () => {
    const response = await api.get('/weather/layers');
    return response.data;
  },

  getForecastTimeline: async (countryCode, hours = 6) => {
    const response = await api.get('/weather/forecast/timeline', {
      params: {
        countryCode,
        hours
      }
    });
    return response.data;
  }
};

export const getTileUrl = (layer, z, x, y) => {
  return `${API_BASE_URL.replace('/api', '')}/tiles/${layer}/${z}/${x}/${y}.png`;
};

export default api;