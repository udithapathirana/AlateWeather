// frontend/src/components/Map/WindParticleLayer.jsx
import { useEffect, useRef } from 'react';
import { weatherAPI } from '../../services/api';

const WindParticleLayer = ({ map, country, weatherData }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const vectorFieldRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create canvas overlay
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    
    const container = map.getContainer();
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // Initialize particles
    initializeParticles();

    // Fetch wind vector data
    fetchWindData();

    // Handle map resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    map.on('resize', handleResize);
    handleResize();

    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      map.off('resize', handleResize);
    };
  }, [map, country]);

  const fetchWindData = async () => {
    if (!country) return;

    try {
      const bounds = {
        minLat: country.bounds.minLat,
        maxLat: country.bounds.maxLat,
        minLng: country.bounds.minLng,
        maxLng: country.bounds.maxLng
      };

      const response = await weatherAPI.getWindVectors(bounds, 30);
      if (response.success) {
        vectorFieldRef.current = response.data;
      }
    } catch (error) {
      console.error('Error fetching wind data:', error);
    }
  };

  const initializeParticles = () => {
    const particleCount = 3000;
    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random(),
        y: Math.random(),
        age: Math.random() * 100,
        speed: 0,
        vx: 0,
        vy: 0
      });
    }
  };

  const getWindAtPoint = (lng, lat) => {
    if (!vectorFieldRef.current || !vectorFieldRef.current.vectors) {
      // Default wind
      return { u: Math.random() * 2 - 1, v: Math.random() * 2 - 1 };
    }

    const vectors = vectorFieldRef.current.vectors;
    
    // Find nearest vector
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
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      // Convert particle normalized coords to lat/lng
      const lng = sw.lng + particle.x * (ne.lng - sw.lng);
      const lat = sw.lat + particle.y * (ne.lat - sw.lat);

      // Get wind at this position
      const wind = getWindAtPoint(lng, lat);

      // Update velocity
      const speedFactor = 0.002;
      particle.vx = wind.u * speedFactor;
      particle.vy = -wind.v * speedFactor; // Invert y for canvas

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Age the particle
      particle.age++;

      // Reset if old or out of bounds
      if (particle.age > 100 || particle.x < 0 || particle.x > 1 || particle.y < 0 || particle.y > 1) {
        particle.x = Math.random();
        particle.y = Math.random();
        particle.age = 0;
      }

      // Draw particle
      const px = particle.x * width;
      const py = particle.y * height;
      const alpha = Math.max(0, 1 - particle.age / 100);
      const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
      
      ctx.beginPath();
      ctx.arc(px, py, 1 + speed * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  return null;
};

export default WindParticleLayer;