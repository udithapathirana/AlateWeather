// frontend/src/components/Map/WindParticleLayer.jsx
import { useEffect, useRef, useCallback } from "react";
import { getGlobalWindField } from '../../services/api';

const WindParticleLayer = ({ map, enabled = true }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const vectorFieldRef = useRef(null);
  const initializedRef = useRef(false);

  // Only initialize ONCE
  useEffect(() => {
    if (!map || initializedRef.current) return;
    
    initializedRef.current = true;
    console.log("🌬️ Initializing wind particles (ONE TIME)");

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    canvas.style.opacity = enabled ? "1" : "0";
    map.getContainer().appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d", { alpha: true });

    // Setup
    const handleResize = () => {
      const rect = map.getContainer().getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    map.on("resize", handleResize);
    handleResize();
    
    // Initialize wind and particles
    const init = async () => {
      try {
        const response = await getGlobalWindField();
        vectorFieldRef.current = response.data;
        console.log("✓ Wind field loaded");
        
        // Initialize particles
        particlesRef.current = [];
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        for (let i = 0; i < 4000; i++) {
          particlesRef.current.push({
            lng: sw.lng + Math.random() * (ne.lng - sw.lng),
            lat: sw.lat + Math.random() * (ne.lat - sw.lat),
            age: Math.random() * 100,
            maxAge: 80 + Math.random() * 60
          });
        }
        
        console.log("✓ 4000 particles initialized");
        
        // Start animation
        const animate = () => {
          if (!canvas || !ctx) return;

          const width = canvas.width;
          const height = canvas.height;

          // Fade
          ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
          ctx.globalCompositeOperation = "destination-in";
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "source-over";

          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const zoom = map.getZoom();

          particlesRef.current.forEach((p) => {
            // Get wind
            const wind = getWindAtLatLng(p.lat, p.lng);
            
            // Old position
            const point = map.project([p.lng, p.lat]);
            const oldX = point.x;
            const oldY = point.y;

            // Update
            const speedFactor = 0.012 * Math.max(0.3, Math.min(2, zoom / 4));
            p.lng += wind.u * speedFactor;
            p.lat += wind.v * speedFactor;

            // Wrap/clamp
            if (p.lng > 180) p.lng -= 360;
            if (p.lng < -180) p.lng += 360;
            if (p.lat > 85) p.lat = 85;
            if (p.lat < -85) p.lat = -85;

            p.age++;

            // Reset if needed
            const marginLng = (ne.lng - sw.lng) * 0.5;
            const marginLat = (ne.lat - sw.lat) * 0.5;
            
            if (p.age > p.maxAge || 
                p.lng < sw.lng - marginLng || p.lng > ne.lng + marginLng ||
                p.lat < sw.lat - marginLat || p.lat > ne.lat + marginLat) {
              p.lng = sw.lng + Math.random() * (ne.lng - sw.lng);
              p.lat = sw.lat + Math.random() * (ne.lat - sw.lat);
              p.age = 0;
              return;
            }

            // New position
            const newPoint = map.project([p.lng, p.lat]);
            const newX = newPoint.x;
            const newY = newPoint.y;

            // Draw if visible
            if (newX >= -30 && newX <= width + 30 && 
                newY >= -30 && newY <= height + 30) {
              
              const dx = newX - oldX;
              const dy = newY - oldY;
              const lineLength = Math.sqrt(dx * dx + dy * dy);
              
              if (lineLength > 0.5 && lineLength < 40) {
                const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
                const opacity = Math.min(0.8, 0.3 + speed * 0.025);
                const ageFactor = 1 - (p.age / p.maxAge);

                ctx.beginPath();
                ctx.moveTo(oldX, oldY);
                ctx.lineTo(newX, newY);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * ageFactor * 0.8})`;
                ctx.lineWidth = 1.3;
                ctx.stroke();
              }
            }
          });

          animationRef.current = requestAnimationFrame(animate);
        };

        // Helper function
        const getWindAtLatLng = (lat, lng) => {
          const field = vectorFieldRef.current;
          if (!field || !field.grid) return { u: 3, v: 1 };

          const { grid, gridSize, latMin, latMax, lngMin, lngMax } = field;

          while (lng < -180) lng += 360;
          while (lng > 180) lng -= 360;
          lat = Math.max(latMin, Math.min(latMax, lat));

          let x = ((lng - lngMin) / (lngMax - lngMin)) * gridSize;
          let y = ((lat - latMin) / (latMax - latMin)) * gridSize;

          x = Math.max(0, Math.min(gridSize - 0.001, x));
          y = Math.max(0, Math.min(gridSize - 0.001, y));

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

        // Start!
        animate();
        console.log("🌬️ Wind animation started!");
        
      } catch (error) {
        console.error("Failed to initialize wind:", error);
      }
    };

    init();

    // Cleanup only on unmount
    return () => {
      console.log("🧹 Cleaning up wind particles");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      map.off("resize", handleResize);
      initializedRef.current = false;
    };
  }, []); // Empty deps - truly initialize once

  // Toggle visibility
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.opacity = enabled ? "1" : "0";
      console.log("Wind particles", enabled ? "✅ enabled" : "❌ disabled");
    }
  }, [enabled]);

  return null;
};

export default WindParticleLayer;