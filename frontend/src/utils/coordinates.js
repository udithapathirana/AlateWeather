// frontend/src/utils/coordinates.js
export const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
};

export const tileToLatLng = (x, y, zoom) => {
  const n = Math.pow(2, zoom);
  const lng = x / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = latRad * 180 / Math.PI;
  return { lat, lng };
};

export const getBoundsForTile = (x, y, zoom) => {
  const nw = tileToLatLng(x, y, zoom);
  const se = tileToLatLng(x + 1, y + 1, zoom);
  return {
    north: nw.lat,
    south: se.lat,
    west: nw.lng,
    east: se.lng
  };
};