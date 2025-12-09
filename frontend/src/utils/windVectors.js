// frontend/src/utils/windVectors.js
export const buildWindGrid = (vectors, bounds, gridSize = 40) => {
  const grid = [];
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
  const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;

  for (let gy = 0; gy <= gridSize; gy++) {
    const row = [];
    for (let gx = 0; gx <= gridSize; gx++) {
      const lat = bounds.minLat + gy * latStep;
      const lng = bounds.minLng + gx * lngStep;

      // Inverse Distance Weighting (IDW)
      let sumU = 0, sumV = 0, sumW = 0;

      for (const v of vectors) {
        const d = Math.sqrt((lat - v.lat) ** 2 + (lng - v.lng) ** 2) || 0.0001;
        const w = 1 / (d * d);
        sumU += v.u * w;
        sumV += v.v * w;
        sumW += w;
      }

      row.push({ u: sumU / sumW, v: sumV / sumW });
    }
    grid.push(row);
  }

  return { grid, gridSize, bounds };
};

export const getWindAtPoint = (lng, lat, field) => {
  if (!field || !field.grid) return { u: 0, v: 0 };

  const { grid, gridSize, bounds } = field;

  // Normalize to [0, gridSize]
  let x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * gridSize;
  let y = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * gridSize;

  // Clamp to valid indices
  x = Math.max(0, Math.min(gridSize, x));
  y = Math.max(0, Math.min(gridSize, y));

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, gridSize);
  const y1 = Math.min(y0 + 1, gridSize);

  const dx = x - x0;
  const dy = y - y0;

  const v00 = grid[y0][x0];
  const v10 = grid[y0][x1];
  const v01 = grid[y1][x0];
  const v11 = grid[y1][x1];

  const u = v00.u * (1 - dx) * (1 - dy) +
            v10.u * dx * (1 - dy) +
            v01.u * (1 - dx) * dy +
            v11.u * dx * dy;

  const v = v00.v * (1 - dx) * (1 - dy) +
            v10.v * dx * (1 - dy) +
            v01.v * (1 - dx) * dy +
            v11.v * dx * dy;

  return { u, v };
};
