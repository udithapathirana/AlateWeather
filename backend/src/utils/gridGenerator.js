// backend/src/utils/gridGenerator.js

export function generateGrid(bounds, resolution) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latStep = (maxLat - minLat) / resolution;
  const lngStep = (maxLng - minLng) / resolution;
  
  const grid = [];
  
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      grid.push({
        lat: minLat + i * latStep,
        lng: minLng + j * lngStep,
        gridX: j,
        gridY: i
      });
    }
  }
  
  return grid;
}

export function generateHexGrid(bounds, hexSize) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const hexHeight = hexSize * Math.sqrt(3);
  const hexWidth = hexSize * 2;
  
  const grid = [];
  let row = 0;
  
  for (let lat = minLat; lat <= maxLat; lat += hexHeight * 0.75) {
    const offset = (row % 2) * (hexWidth / 2);
    let col = 0;
    
    for (let lng = minLng + offset; lng <= maxLng; lng += hexWidth) {
      grid.push({
        lat,
        lng,
        row,
        col,
        type: 'hex'
      });
      col++;
    }
    row++;
  }
  
  return grid;
}

export function snapToGrid(lat, lng, gridResolution) {
  const gridLat = Math.round(lat * gridResolution) / gridResolution;
  const gridLng = Math.round(lng * gridResolution) / gridResolution;
  return { lat: gridLat, lng: gridLng };
}

export function getGridCell(lat, lng, bounds, resolution) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latStep = (maxLat - minLat) / resolution;
  const lngStep = (maxLng - minLng) / resolution;
  
  const cellY = Math.floor((lat - minLat) / latStep);
  const cellX = Math.floor((lng - minLng) / lngStep);
  
  return {
    x: Math.max(0, Math.min(resolution - 1, cellX)),
    y: Math.max(0, Math.min(resolution - 1, cellY))
  };
}

export function getCellBounds(cellX, cellY, bounds, resolution) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const latStep = (maxLat - minLat) / resolution;
  const lngStep = (maxLng - minLng) / resolution;
  
  return {
    minLat: minLat + cellY * latStep,
    maxLat: minLat + (cellY + 1) * latStep,
    minLng: minLng + cellX * lngStep,
    maxLng: minLng + (cellX + 1) * lngStep
  };
}