// frontend/public/wind-particles.worker.js
// Web Worker for particle simulation to keep UI thread free

let particles = [];
let windField = [];
let bounds = null;
let particleCount = 3000;

// Initialize particles
function initializeParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      age: Math.random() * 100,
      maxAge: 100,
      vx: 0,
      vy: 0
    });
  }
  return particles;
}

// Get wind at specific point using interpolation
function getWindAtPoint(x, y) {
  if (!windField || windField.length === 0) {
    // Default wind
    return { u: Math.random() * 2 - 1, v: Math.random() * 2 - 1 };
  }

  // Convert normalized coordinates to lat/lng
  const lng = bounds.west + x * (bounds.east - bounds.west);
  const lat = bounds.south + y * (bounds.north - bounds.south);

  // Find nearest wind vector
  let nearest = windField[0];
  let minDist = Infinity;

  for (const vector of windField) {
    const dist = Math.sqrt(
      Math.pow(vector.lat - lat, 2) + Math.pow(vector.lng - lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = vector;
    }
  }

  return { u: nearest.u || 0, v: nearest.v || 0 };
}

// Update particles
function updateParticles(deltaTime) {
  const speedFactor = 0.002 * (deltaTime / 16); // Normalize to 60fps

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];

    // Get wind at current position
    const wind = getWindAtPoint(particle.x, particle.y);

    // Update velocity
    particle.vx = wind.u * speedFactor;
    particle.vy = -wind.v * speedFactor; // Invert y for canvas coords

    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Age particle
    particle.age += deltaTime / 16;

    // Reset if old or out of bounds
    if (
      particle.age > particle.maxAge ||
      particle.x < 0 ||
      particle.x > 1 ||
      particle.y < 0 ||
      particle.y > 1
    ) {
      particle.x = Math.random();
      particle.y = Math.random();
      particle.age = 0;
    }
  }

  return particles;
}

// Bilinear interpolation for smoother wind field
function interpolateWind(x, y) {
  if (!windField || windField.length === 0) {
    return { u: 0, v: 0 };
  }

  // Find 4 surrounding points
  const lng = bounds.west + x * (bounds.east - bounds.west);
  const lat = bounds.south + y * (bounds.north - bounds.south);

  // Get nearest 4 vectors
  const nearest = windField
    .map(v => ({
      ...v,
      dist: Math.sqrt(Math.pow(v.lat - lat, 2) + Math.pow(v.lng - lng, 2))
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  if (nearest.length === 0) return { u: 0, v: 0 };
  if (nearest[0].dist < 0.001) return { u: nearest[0].u, v: nearest[0].v };

  // Inverse distance weighting
  const totalWeight = nearest.reduce((sum, p) => sum + 1 / (p.dist + 0.001), 0);
  let u = 0,
    v = 0;

  for (const point of nearest) {
    const weight = 1 / (point.dist + 0.001) / totalWeight;
    u += point.u * weight;
    v += point.v * weight;
  }

  return { u, v };
}

// Message handler
self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      particleCount = data.particleCount || 3000;
      const initialParticles = initializeParticles(particleCount);
      self.postMessage({
        type: 'initialized',
        particles: initialParticles
      });
      break;

    case 'setWindField':
      windField = data.windField || [];
      bounds = data.bounds || null;
      self.postMessage({ type: 'windFieldSet' });
      break;

    case 'update':
      const deltaTime = data.deltaTime || 16;
      const updatedParticles = updateParticles(deltaTime);
      self.postMessage({
        type: 'updated',
        particles: updatedParticles
      });
      break;

    case 'reset':
      const resetParticles = initializeParticles(particleCount);
      self.postMessage({
        type: 'reset',
        particles: resetParticles
      });
      break;

    case 'setParticleCount':
      particleCount = data.count;
      const newParticles = initializeParticles(particleCount);
      self.postMessage({
        type: 'particleCountSet',
        particles: newParticles
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};