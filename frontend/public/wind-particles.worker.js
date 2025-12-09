// Web Worker for particle simulation using smoothed grid

let particles = [];
let windField = null;
let bounds = null;
let particleCount = 3000;

function initializeParticles(count) {
  particles = Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    age: Math.random() * 100,
    maxAge: 100,
    vx: 0,
    vy: 0
  }));
  return particles;
}

// Bilinear interpolation function
function getWindAtPoint(x, y) {
  if (!windField || !windField.grid || !bounds) return { u: 0, v: 0 };

  const lng = bounds.west + x * (bounds.east - bounds.west);
  const lat = bounds.south + y * (bounds.north - bounds.south);

  const { grid, gridSize } = windField;
  const minLat = bounds.south;
  const maxLat = bounds.north;
  const minLng = bounds.west;
  const maxLng = bounds.east;

  const xi = ((lng - minLng) / (maxLng - minLng)) * gridSize;
  const yi = ((lat - minLat) / (maxLat - minLat)) * gridSize;

  const x0 = Math.floor(xi);
  const y0 = Math.floor(yi);
  const x1 = Math.min(x0 + 1, gridSize);
  const y1 = Math.min(y0 + 1, gridSize);

  const dx = xi - x0;
  const dy = yi - y0;

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
}

function updateParticles(deltaTime) {
  const speedFactor = 0.002 * (deltaTime / 16);

  for (let p of particles) {
    const wind = getWindAtPoint(p.x, p.y);
    p.vx = wind.u * speedFactor;
    p.vy = -wind.v * speedFactor;

    p.x += p.vx;
    p.y += p.vy;
    p.age += deltaTime / 16;

    if (p.age > p.maxAge || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
      p.x = Math.random();
      p.y = Math.random();
      p.age = 0;
    }
  }

  return particles;
}

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch(type) {
    case 'init':
      particleCount = data.particleCount || 3000;
      self.postMessage({ type: 'initialized', particles: initializeParticles(particleCount) });
      break;

    case 'setWindField':
      windField = data.windField;
      bounds = data.bounds;
      self.postMessage({ type: 'windFieldSet' });
      break;

    case 'update':
      const deltaTime = data.deltaTime || 16;
      self.postMessage({ type: 'updated', particles: updateParticles(deltaTime) });
      break;

    case 'reset':
      self.postMessage({ type: 'reset', particles: initializeParticles(particleCount) });
      break;

    case 'setParticleCount':
      particleCount = data.count;
      self.postMessage({ type: 'particleCountSet', particles: initializeParticles(particleCount) });
      break;

    default:
      console.warn('Unknown worker message type:', type);
  }
};
