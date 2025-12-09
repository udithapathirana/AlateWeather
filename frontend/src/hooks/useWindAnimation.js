// frontend/src/hooks/useWindAnimation.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { weatherAPI } from '../services/api';

const useWindAnimation = (map, country, enabled = true) => {
  const [windData, setWindData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch wind vector data
  const fetchWindData = useCallback(async () => {
    if (!country || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const bounds = {
        minLat: country.bounds.minLat,
        maxLat: country.bounds.maxLat,
        minLng: country.bounds.minLng,
        maxLng: country.bounds.maxLng
      };

      const response = await weatherAPI.getWindVectors(bounds, 30);
      
      if (response.success) {
        setWindData(response.data);
      } else {
        throw new Error('Failed to fetch wind data');
      }
    } catch (err) {
      console.error('Error fetching wind data:', err);
      setError(err.message);
      // Generate fallback procedural wind data
      setWindData(generateFallbackWindData(country));
    } finally {
      setLoading(false);
    }
  }, [country, enabled]);

  // Initialize particles
  const initializeParticles = useCallback((count = 3000) => {
    particlesRef.current = [];
    
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: Math.random(),
        y: Math.random(),
        age: Math.random() * 100,
        maxAge: 100,
        speed: 0,
        vx: 0,
        vy: 0
      });
    }
  }, []);

  // Get wind at specific point
  const getWindAtPoint = useCallback((lng, lat) => {
    if (!windData || !windData.vectors) {
      return { u: 0, v: 0 };
    }

    const vectors = windData.vectors;
    
    // Find nearest vector using simple distance
    let nearest = null;
    let minDist = Infinity;

    for (const vector of vectors) {
      const dist = Math.sqrt(
        Math.pow(vector.lat - lat, 2) + Math.pow(vector.lng - lng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = vector;
      }
    }

    return nearest ? { u: nearest.u, v: nearest.v } : { u: 0, v: 0 };
  }, [windData]);

  // Animation loop
  const animate = useCallback(() => {
    if (!canvasRef.current || !map || !enabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Fade previous frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    particlesRef.current.forEach(particle => {
      // Convert normalized coords to lat/lng
      const lng = sw.lng + particle.x * (ne.lng - sw.lng);
      const lat = sw.lat + particle.y * (ne.lat - sw.lat);

      // Get wind at this position
      const wind = getWindAtPoint(lng, lat);

      // Update velocity
      const speedFactor = 0.002;
      particle.vx = wind.u * speedFactor;
      particle.vy = -wind.v * speedFactor;

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Age particle
      particle.age++;

      // Reset if old or out of bounds
      if (particle.age > particle.maxAge || 
          particle.x < 0 || particle.x > 1 || 
          particle.y < 0 || particle.y > 1) {
        particle.x = Math.random();
        particle.y = Math.random();
        particle.age = 0;
      }

      // Draw particle
      const px = particle.x * width;
      const py = particle.y * height;
      const alpha = Math.max(0, 1 - particle.age / particle.maxAge);
      const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
      
      ctx.beginPath();
      ctx.arc(px, py, 1 + speed * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [map, enabled, getWindAtPoint]);

  // Setup canvas
  useEffect(() => {
    if (!map || !enabled) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    
    const container = map.getContainer();
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const handleResize = () => {
      if (canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    map.on('resize', handleResize);
    handleResize();

    initializeParticles();
    fetchWindData();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      map.off('resize', handleResize);
    };
  }, [map, enabled, fetchWindData, initializeParticles]);

  // Start/stop animation
  useEffect(() => {
    if (enabled && windData && map) {
      animate();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, windData, map, animate]);

  return {
    windData,
    loading,
    error,
    refetch: fetchWindData
  };
};

// Generate fallback wind data
function generateFallbackWindData(country) {
  const vectors = [];
  const { minLat, maxLat, minLng, maxLng } = country.bounds;
  const resolution = 30;
  
  const latStep = (maxLat - minLat) / resolution;
  const lngStep = (maxLng - minLng) / resolution;
  
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const lat = minLat + i * latStep;
      const lng = minLng + j * lngStep;
      
      const seed = lat * 0.01 + lng * 0.01;
      const noise1 = Math.sin(seed * 10) * Math.cos(seed * 8);
      const noise2 = Math.sin(seed * 12) * Math.cos(seed * 6);
      
      const speed = Math.abs(noise1 * 15) + 5;
      const direction = (noise2 + 1) * 180;
      
      const radians = (270 - direction) * (Math.PI / 180);
      const u = speed * Math.cos(radians);
      const v = speed * Math.sin(radians);
      
      vectors.push({ lat, lng, u, v, speed, direction });
    }
  }
  
  return {
    vectors,
    bounds: { minLat, maxLat, minLng, maxLng },
    dataSource: 'procedural'
  };
}

export default useWindAnimation;