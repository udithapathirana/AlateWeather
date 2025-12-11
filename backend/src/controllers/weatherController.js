// backend/src/controllers/weatherController.js
import weatherService from '../services/weatherService.js';

export const getGlobalWeatherLayer = async (req, res) => {
  try {
    const { layer } = req.params;
    
    console.log(`Fetching global ${layer} data...`);
    
    const data = await weatherService.fetchGlobalWeatherData(layer);
    
    res.json({
      success: true,
      layer,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching global weather layer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getGlobalWindField = async (req, res) => {
  try {
    console.log('Fetching global wind field...');
    
    const windField = await weatherService.getGlobalWindField();
    
    res.json({
      success: true,
      data: windField,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching wind field:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCountryWeather = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { layers } = req.query;
    
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country code is required'
      });
    }
    
    const layerArray = layers ? layers.split(',') : ['rain', 'wind', 'temperature'];
    
    console.log(`Fetching weather for ${countryCode}, layers: ${layerArray.join(', ')}`);
    
    const weatherData = await weatherService.fetchCountryWeather(
      countryCode,
      layerArray
    );
    
    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching country weather:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch weather data'
    });
  }
};

export const getAvailableLayers = (req, res) => {
  res.json({
    success: true,
    layers: [
      { 
        id: 'rain', 
        name: 'Precipitation', 
        unit: 'mm/h', 
        color: '#00c8ff',
        description: 'Rainfall intensity',
        minValue: 0,
        maxValue: 50
      },
      { 
        id: 'wind', 
        name: 'Wind Speed', 
        unit: 'm/s', 
        color: '#ffc800',
        description: 'Wind speed and direction',
        minValue: 0,
        maxValue: 40
      },
      { 
        id: 'temperature', 
        name: 'Temperature', 
        unit: '°C', 
        color: '#ff4444',
        description: 'Air temperature',
        minValue: -30,
        maxValue: 50
      },
      { 
        id: 'clouds', 
        name: 'Cloud Cover', 
        unit: '%', 
        color: '#cccccc',
        description: 'Cloud coverage',
        minValue: 0,
        maxValue: 100
      },
      { 
        id: 'storm', 
        name: 'Storm Intensity', 
        unit: 'index', 
        color: '#8b008b',
        description: 'Combined storm severity',
        minValue: 0,
        maxValue: 100
      }
    ]
  });
};