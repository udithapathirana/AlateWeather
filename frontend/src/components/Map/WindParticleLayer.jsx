// frontend/src/components/Map/WindParticleLayer.jsx
import { useEffect, useRef } from "react";
import { getGlobalWindField } from '../../services/api';

const WindParticleLayer = ({ map, enabled = true }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const vectorFieldRef = useRef(null);
  const initializedRef = useRef(false);
  const lastFetchRef = useRef(0);

  // Initialize wind field and particles
  useEffect(() => {
    if (!map || initializedRef.current) return;
    
    initializedRef.current = true;
    console.log("🌬️ Initializing REAL wind particles");

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    canvas.className = "wind-particle-canvas";
    
    const container = map.getContainer();
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d", { alpha: true });

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log(`Canvas resized: ${canvas.width}x${canvas.height}`);
    };

    map.on("resize", handleResize);
    handleResize();
    
    // Load REAL wind field and start animation
    const init = async () => {
      try {
        console.log("📡 Fetching REAL global wind field from API...");
        const response = await getGlobalWindField();
        
        if (!response.success || !response.data) {
          throw new Error("Failed to get wind field data");
        }
        
        vectorFieldRef.current = response.data;
        lastFetchRef.current = Date.now();
        
        console.log("✅ REAL wind field loaded from API");
        console.log("Grid size:", vectorFieldRef.current.gridSize);
        console.log("Sample wind at equator:", getWindAtLatLng(0, 0));
        
        // Initialize particles
        initializeParticles();
        
        // Start animation
        console.log("🎬 Starting REAL wind animation with API data");
        animate();
        
      } catch (error) {
        console.error("❌ Failed to load REAL wind data:", error);
        console.warn("⚠️ This means wind particles won't show real data");
      }
    };

    const initializeParticles = () => {
      particlesRef.current = [];
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      const particleCount = 6000;
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          lng: sw.lng + Math.random() * (ne.lng - sw.lng),
          lat: sw.lat + Math.random() * (ne.lat - sw.lat),
          age: Math.random() * 100,
          maxAge: 50 + Math.random() * 100
        });
      }
      
      console.log(`✅ ${particleCount} particles initialized`);
    };

    const getWindAtLatLng = (lat, lng) => {
      const field = vectorFieldRef.current;
      if (!field || !field.grid) {
        console.warn("⚠️ No wind field data available");
        return { u: 0, v: 0 };
      }

      const { grid, gridSize, latMin, latMax, lngMin, lngMax } = field;

      // Normalize longitude to -180 to 180
      while (lng < -180) lng += 360;
      while (lng > 180) lng -= 360;
      
      // Clamp latitude
      lat = Math.max(latMin, Math.min(latMax, lat));

      // Map to grid coordinates [0, gridSize]
      let x = ((lng - lngMin) / (lngMax - lngMin)) * gridSize;
      let y = ((lat - latMin) / (latMax - latMin)) * gridSize;

      // Clamp to valid grid indices
      x = Math.max(0, Math.min(gridSize - 0.001, x));
      y = Math.max(0, Math.min(gridSize - 0.001, y));

      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, gridSize);
      const y1 = Math.min(y0 + 1, gridSize);

      const dx = x - x0;
      const dy = y - y0;

      // Get grid values
      const v00 = grid[y0]?.[x0] || { u: 0, v: 0 };
      const v10 = grid[y0]?.[x1] || { u: 0, v: 0 };
      const v01 = grid[y1]?.[x0] || { u: 0, v: 0 };
      const v11 = grid[y1]?.[x1] || { u: 0, v: 0 };

      // Bilinear interpolation
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

    const animate = () => {
      if (!canvas || !ctx || !canvasRef.current) return;

      // Periodically refresh wind data (every 30 minutes)
      const now = Date.now();
      if (now - lastFetchRef.current > 30 * 60 * 1000) {
        console.log("🔄 Refreshing wind field data...");
        init();
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Fade previous frame for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const zoom = map.getZoom();

      let drawnCount = 0;
      const maxDraw = 4000; // Limit for performance

      particlesRef.current.forEach((p) => {
        if (drawnCount >= maxDraw) return;

        // Get REAL wind vector at particle position from API data
        const wind = getWindAtLatLng(p.lat, p.lng);
        
        // Store old position for drawing line
        const oldPoint = map.project([p.lng, p.lat]);
        const oldX = oldPoint.x;
        const oldY = oldPoint.y;

        // Update particle position based on REAL WIND DATA
        // Speed factor adjusted for realistic movement
        const baseSpeed = 0.008; // Base movement factor
        const zoomFactor = Math.max(0.3, Math.min(3, zoom / 6));
        const speedFactor = baseSpeed * zoomFactor;
        
        // Move particle according to wind U/V components
        p.lng += wind.u * speedFactor;
        p.lat += wind.v * speedFactor;

        // Handle longitude wrapping (goes around the globe)
        if (p.lng > 180) p.lng -= 360;
        if (p.lng < -180) p.lng += 360;
        
        // Clamp latitude (can't go past poles)
        if (p.lat > 85) p.lat = 85;
        if (p.lat < -85) p.lat = -85;

        p.age++;

        // Check if particle needs reset (out of view or too old)
        const marginLng = (ne.lng - sw.lng) * 1.0;
        const marginLat = (ne.lat - sw.lat) * 1.0;
        
        if (p.age > p.maxAge || 
            p.lng < sw.lng - marginLng || p.lng > ne.lng + marginLng ||
            p.lat < sw.lat - marginLat || p.lat > ne.lat + marginLat) {
          // Reset particle within current view
          p.lng = sw.lng + Math.random() * (ne.lng - sw.lng);
          p.lat = sw.lat + Math.random() * (ne.lat - sw.lat);
          p.age = 0;
          p.maxAge = 50 + Math.random() * 100;
          return;
        }

        // Project new position to screen coordinates
        const newPoint = map.project([p.lng, p.lat]);
        const newX = newPoint.x;
        const newY = newPoint.y;

        // Only draw if visible on screen
        if (newX >= -100 && newX <= width + 100 && 
            newY >= -100 && newY <= height + 100) {
          
          drawnCount++;
          
          const dx = newX - oldX;
          const dy = newY - oldY;
          const lineLength = Math.sqrt(dx * dx + dy * dy);
          
          // Draw particle trail
          if (lineLength > 0.2 && lineLength < 60) {
            // Calculate wind speed for color/opacity
            const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
            
            // Color based on speed
            let r, g, b;
            if (speed < 5) {
              // Slow wind - cyan/blue
              r = 100;
              g = 200 + speed * 10;
              b = 255;
            } else if (speed < 15) {
              // Medium wind - white/yellow
              r = 200 + (speed - 5) * 5;
              g = 200 + (speed - 5) * 5;
              b = 255 - (speed - 5) * 10;
            } else {
              // Fast wind - yellow/orange/red
              r = 255;
              g = Math.max(100, 255 - (speed - 15) * 10);
              b = Math.max(50, 150 - (speed - 15) * 10);
            }

            const speedOpacity = Math.min(0.9, 0.2 + speed * 0.04);
            const ageFactor = 1 - (p.age / p.maxAge);
            const finalOpacity = speedOpacity * ageFactor * 0.8;

            // Draw the wind trail
            ctx.beginPath();
            ctx.moveTo(oldX, oldY);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
            ctx.lineWidth = Math.min(2.5, 1 + speed * 0.1);
            ctx.stroke();
            
            // Add particle head for better visibility
            ctx.beginPath();
            ctx.arc(newX, newY, Math.min(2, 0.8 + speed * 0.08), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity * 1.2})`;
            ctx.fill();
          }
        }
      });

      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };

    init();

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up wind particles");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      map.off("resize", handleResize);
      initializedRef.current = false;
    };
  }, [map]);

  // Handle visibility toggling
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.display = enabled ? "block" : "none";
      canvasRef.current.style.opacity = enabled ? "1" : "0";
      console.log(`Wind particles ${enabled ? "✅ ENABLED (showing REAL wind)" : "❌ disabled"}`);
    }
  }, [enabled]);

  return null;
};

export default WindParticleLayer;