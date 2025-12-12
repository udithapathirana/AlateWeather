// frontend/src/services/api.js
const API_BASE_URL = 'http://localhost:5000/api';

/* -------------------------
   GLOBAL WEATHER LAYER API
------------------------- */
export async function getGlobalWeatherLayer(layer) {
  try {
    console.log(`Fetching ${layer}...`);
    const response = await fetch(`${API_BASE_URL}/weather/global/${layer}`);
    const data = await response.json();

    if (data.success) {
      console.log(`✓ Got ${data.data.length} points for ${layer}`);
      return data;
    }
    throw new Error(data.error || 'API failed');
  } catch (error) {
    console.warn(`API failed for ${layer}, using fallback`);
    return { success: false, data: generateFallbackData(layer) };
  }
}

/* -------------------------
   GLOBAL WIND FIELD API
------------------------- */
export async function getGlobalWindField() {
  try {
    console.log('Fetching wind field...');
    const response = await fetch(`${API_BASE_URL}/weather/wind-field`);
    const data = await response.json();

    if (data.success) {
      console.log('✓ Got wind field');
      return data;
    }
    throw new Error(data.error || 'API failed');
  } catch (error) {
    console.warn('API failed for wind, using fallback');
    return { success: false, data: generateFallbackWindField() };
  }
}

/* -------------------------
   FALLBACK GENERATORS
------------------------- */
function generateFallbackData(layer) {
  console.log(`Generating fallback ${layer}`);
  const points = [];
  const density = 1500;

  for (let i = 0; i < density; i++) {
    const lat = -85 + Math.random() * 170;
    const lng = -180 + Math.random() * 360;
    const seed = lat * 0.05 + lng * 0.05;
    const noise = (Math.sin(seed * 15) * Math.cos(seed * 12) + 1) * 0.5;

    let value;
    switch (layer) {
      case 'temperature':
        value = -10 + noise * 50;
        break;
      case 'rain':
        value = noise * 100;
        break;
      case 'wind':
        value = 5 + noise * 40;
        break;
      case 'clouds':
        value = noise * 100;
        break;
      case 'storm':
        value = noise > 0.7 ? noise * 100 : noise * 25;
        break;
      default:
        value = noise * 100;
    }

    points.push({
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      value: parseFloat(value.toFixed(2)),
    });
  }

  return points;
}

function generateFallbackWindField() {
  console.log('Generating fallback wind field');
  const gridSize = 60;
  const grid = [];

  for (let y = 0; y <= gridSize; y++) {
    const row = [];
    const lat = -85 + (y / gridSize) * 170;

    for (let x = 0; x <= gridSize; x++) {
      const lng = -180 + (x / gridSize) * 360;
      const absLat = Math.abs(lat);

      let u = absLat < 30 ? -10 : absLat < 60 ? 15 : -8;
      let v = Math.sin((lat * Math.PI) / 180) * 4;

      const s = lat * 0.05 + lng * 0.05;
      const noise = Math.sin(s * 8) * Math.cos(s * 6);

      u += noise * 6;
      v += noise * 3;

      row.push({ u, v });
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
  };
}

/* -------------------------
   CLEAR WEATHER API EXPORT
------------------------- */
export const weatherAPI = {
  getGlobalWeatherLayer,
  getGlobalWindField
};
