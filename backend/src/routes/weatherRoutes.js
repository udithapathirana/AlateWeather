// backend/src/routes/weatherRoutes.js
import express from 'express';
import {
  getCountryWeather,
  getHeatmapData,
  getWindVectors,
  getAvailableLayers,
  getForecastTimeline,
  getWeatherHistory,
  getDatabaseStats
} from '../controllers/weatherController.js';

const router = express.Router();

// Get weather data for a specific country
// GET /api/weather/country/:countryCode?layers=rain,wind,temperature
router.get('/country/:countryCode', getCountryWeather);

// Get heatmap data for a specific region
// GET /api/weather/heatmap?bounds=minLat,minLng,maxLat,maxLng&zoom=5&layer=temperature
router.get('/heatmap', getHeatmapData);

// Get wind vector field data
// GET /api/weather/wind-vectors?bounds=minLat,minLng,maxLat,maxLng&resolution=50
router.get('/wind-vectors', getWindVectors);

// Get list of available weather layers
// GET /api/weather/layers
router.get('/layers', getAvailableLayers);

// Get forecast timeline for a country
// GET /api/weather/forecast/timeline?countryCode=US&hours=6
router.get('/forecast/timeline', getForecastTimeline);

// Get weather history for a country
// GET /api/weather/history/:countryCode?limit=10
router.get('/history/:countryCode', getWeatherHistory);

// Get database statistics
// GET /api/weather/stats
router.get('/stats', getDatabaseStats);

export default router;