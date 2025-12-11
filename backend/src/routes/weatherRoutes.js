// backend/src/routes/weatherRoutes.js
import express from 'express';
import {
  getGlobalWeatherLayer,
  getGlobalWindField,
  getCountryWeather,
  getAvailableLayers
} from '../controllers/weatherController.js';

const router = express.Router();

// Get global weather layer data
// GET /api/weather/global/:layer (temperature, rain, wind, clouds, storm)
router.get('/global/:layer', getGlobalWeatherLayer);

// Get global wind field for particle animation
// GET /api/weather/wind-field
router.get('/wind-field', getGlobalWindField);

// Get weather data for a specific country (legacy)
// GET /api/weather/country/:countryCode?layers=rain,wind,temperature
router.get('/country/:countryCode', getCountryWeather);

// Get list of available weather layers
// GET /api/weather/layers
router.get('/layers', getAvailableLayers);

export default router;