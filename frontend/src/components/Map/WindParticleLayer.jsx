// frontend/src/components/Map/WindParticleLayer.jsx
import { useEffect, useRef } from "react";

const WindParticleLayer = ({ map }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const vectorFieldRef = useRef(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    console.log("Initializing wind particle layer...");

    // Create canvas overlay
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    map.getContainer().appendChild(canvas);
    canvasRef.current = canvas;

    // Build GLOBAL wind field
    buildGlobalWindField();

    // Initialize particles
    initializeParticles(3000);

    const handleResize = () => {
      const rect = map.getContainer().getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Respawn some particles in new viewport
      const bounds = map.getBounds();
      if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        // Respawn 30% of particles in viewport
        const respawnCount = Math.floor(particlesRef.current.length * 0.3);
        for (let i = 0; i < respawnCount; i++) {
          const idx = Math.floor(Math.random() * particlesRef.current.length);
          particlesRef.current[idx].lng = sw.lng + Math.random() * (ne.lng - sw.lng);
          particlesRef.current[idx].lat = sw.lat + Math.random() * (ne.lat - sw.lat);
          particlesRef.current[idx].age = 0;
        }
      }
    };

    map.on("resize", handleResize);
    map.on("move", handleResize);
    map.on("zoom", handleResize);
    handleResize();

    // Mark as ready and start animation
    isReadyRef.current = true;
    animate();

    return () => {
      isReadyRef.current = false;
      cancelAnimationFrame(animationRef.current);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      map.off("resize", handleResize);
      map.off("move", handleResize);
      map.off("zoom", handleResize);
    };
  }, [map]);

  // Build GLOBAL wind field from REAL API
  const buildGlobalWindField = async () => {
    console.log("Fetching REAL global wind field from API...");
    
    try {
      // Import the API service
      const { weatherAPI } = await import("../../services/api");
      
      // Fetch real wind field
      const response = await weatherAPI.getGlobalWindField();
      const windField = response.data;

      vectorFieldRef.current = windField;
      console.log("✓ REAL global wind field loaded:", windField.gridSize, "x", windField.gridSize);
      
    } catch (error) {
      console.error("Failed to fetch wind field from API:", error);
      console.warn("Using fallback procedural wind field");
      
      // Fallback to procedural
      buildFallbackWindField();
    }
  };

  // Fallback wind field (only if API fails)
  const buildFallbackWindField = () => {
    console.log("Building fallback wind field...");
    
    const gridSize = 60;
    const grid = [];
    
    const latStep = 170 / gridSize;
    const lngStep = 360 / gridSize;

    for (let y = 0; y <= gridSize; y++) {
      const row = [];
      const lat = -85 + y * latStep;
      
      for (let x = 0; x <= gridSize; x++) {
        const lng = -180 + x * lngStep;

        const latRad = (lat * Math.PI) / 180;
        const absLat = Math.abs(lat);
        
        let u, v;
        
        if (absLat < 30) {
          u = -10 - Math.cos(latRad * 4) * 5;
          v = Math.sin(latRad * 3) * 4;
        } else if (absLat < 60) {
          u = 15 + Math.sin(latRad * 3) * 7;
          v = Math.cos(latRad * 4) * 5;
        } else {
          u = -8 - Math.cos(latRad * 5) * 4;
          v = Math.sin(latRad * 3) * 3;
        }

        const s1 = lat * 0.05 + lng * 0.05;
        const s2 = lat * 0.08 + lng * 0.1;
        
        const noise1 = Math.sin(s1 * 8) * Math.cos(s1 * 6);
        const noise2 = Math.sin(s2 * 10) * Math.cos(s2 * 8);
        
        u += noise1 * 6 + noise2 * 3;
        v += noise2 * 6 + noise1 * 3;

        row.push({ u, v });
      }
      grid.push(row);
    }

    vectorFieldRef.current = {
      grid,
      gridSize,
      latMin: -85,
      latMax: 85,
      lngMin: -180,
      lngMax: 180
    };

    console.log("✓ Fallback wind field ready:", gridSize, "x", gridSize);
  };

  // Initialize particles
  const initializeParticles = (count) => {
    console.log("Initializing", count, "particles...");
    particlesRef.current = [];
    
    // Get current viewport to spawn particles in visible area
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    for (let i = 0; i < count; i++) {
      // Spawn particles in viewport or globally
      const spawnInView = Math.random() < 0.7; // 70% in viewport
      
      let lng, lat;
      if (spawnInView && bounds) {
        lng = sw.lng + Math.random() * (ne.lng - sw.lng);
        lat = sw.lat + Math.random() * (ne.lat - sw.lat);
      } else {
        lng = -180 + Math.random() * 360;
        lat = -85 + Math.random() * 170;
      }
      
      particlesRef.current.push({
        lng,
        lat,
        age: Math.random() * 100,
        maxAge: 60 + Math.random() * 50
      });
    }
    console.log("✓ Particles initialized");
  };

  // Get wind at any lat/lng with bilinear interpolation
  const getWindAtLatLng = (lat, lng) => {
    const field = vectorFieldRef.current;
    if (!field || !field.grid) {
      return { u: 5, v: 2 }; // Default wind
    }

    const { grid, gridSize, latMin, latMax, lngMin, lngMax } = field;

    // Wrap longitude
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;

    // Clamp latitude
    lat = Math.max(latMin, Math.min(latMax, lat));

    // Normalize to grid coordinates
    let x = ((lng - lngMin) / (lngMax - lngMin)) * gridSize;
    let y = ((lat - latMin) / (latMax - latMin)) * gridSize;

    // Clamp to valid range
    x = Math.max(0, Math.min(gridSize - 0.001, x));
    y = Math.max(0, Math.min(gridSize - 0.001, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, gridSize);
    const y1 = Math.min(y0 + 1, gridSize);

    const dx = x - x0;
    const dy = y - y0;

    // Bilinear interpolation
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

  // Convert lat/lng to screen pixel
  const latLngToPixel = (lat, lng) => {
    if (!map) return { x: 0, y: 0 };
    
    const point = map.project([lng, lat]);
    return { x: point.x, y: point.y };
  };

  // Convert screen pixel to lat/lng
  const pixelToLatLng = (x, y) => {
    if (!map) return { lat: 0, lng: 0 };
    
    const lngLat = map.unproject([x, y]);
    return { lat: lngLat.lat, lng: lngLat.lng };
  };

  // Animation loop
  const animate = () => {
    if (!isReadyRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas || !map) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Fade trails - faster fade for cleaner look
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Get current viewport
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    let drawnCount = 0;

    particlesRef.current.forEach((p) => {
      // Get wind at particle position
      const wind = getWindAtLatLng(p.lat, p.lng);

      // Store old position
      const oldPos = latLngToPixel(p.lat, p.lng);

      // Update particle position in lat/lng space
      // Adjust speed based on zoom level
      const zoom = map.getZoom();
      const speedFactor = 0.015 * Math.max(0.5, Math.min(2, zoom / 5));
      
      p.lng += wind.u * speedFactor;
      p.lat += wind.v * speedFactor;

      // Wrap longitude
      if (p.lng > 180) p.lng -= 360;
      if (p.lng < -180) p.lng += 360;

      // Clamp latitude
      if (p.lat > 85) p.lat = 85;
      if (p.lat < -85) p.lat = -85;

      p.age++;

      // Reset if too old or far out of viewport
      const marginLng = (ne.lng - sw.lng) * 0.3;
      const marginLat = (ne.lat - sw.lat) * 0.3;
      
      if (p.age > p.maxAge || 
          p.lng < sw.lng - marginLng || p.lng > ne.lng + marginLng ||
          p.lat < sw.lat - marginLat || p.lat > ne.lat + marginLat) {
        // Respawn in viewport
        p.lng = sw.lng + Math.random() * (ne.lng - sw.lng);
        p.lat = sw.lat + Math.random() * (ne.lat - sw.lat);
        p.age = 0;
        return;
      }

      // Get new position
      const newPos = latLngToPixel(p.lat, p.lng);

      // Only draw if visible on screen
      if (newPos.x >= -20 && newPos.x <= width + 20 && 
          newPos.y >= -20 && newPos.y <= height + 20) {
        
        // Calculate line length to avoid ugly long jumps
        const dx = newPos.x - oldPos.x;
        const dy = newPos.y - oldPos.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        
        // Only draw if line is reasonable length
        if (lineLength < 50) {
          const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
          const opacity = Math.min(0.7, 0.25 + speed * 0.02);
          const ageFactor = 1 - (p.age / p.maxAge);

          ctx.beginPath();
          ctx.moveTo(oldPos.x, oldPos.y);
          ctx.lineTo(newPos.x, newPos.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * ageFactor * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          drawnCount++;
        }
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  return null;
};

export default WindParticleLayer;