// frontend/src/components/Map/WindParticleLayer.jsx
import { useEffect, useRef } from "react";
import { weatherAPI } from "../../services/api";

const WindParticleLayer = ({ map, country }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const vectorFieldRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1"; // behind UI
    canvas.style.background = "transparent";
    map.getContainer().appendChild(canvas);
    canvasRef.current = canvas;

    initializeParticles(10000);
    fetchWindData();

    const handleResize = () => {
      const rect = map.getContainer().getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    map.on("resize", handleResize);
    map.on("move", handleResize);
    handleResize();

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      map.off("resize", handleResize);
      map.off("move", handleResize);
    };
  }, [map, country]);

  // --------------------------
  // Fetch wind data & build grid
  // --------------------------
  const fetchWindData = async () => {
    if (!country) return;

    try {
      const bounds = {
        minLat: country.bounds.minLat,
        maxLat: country.bounds.maxLat,
        minLng: country.bounds.minLng,
        maxLng: country.bounds.maxLng,
      };

      const response = await weatherAPI.getWindVectors(bounds, 60);
      if (response.success) {
        vectorFieldRef.current = buildWindGrid(response.data.vectors, bounds, 40);
        console.log("Wind grid built:", vectorFieldRef.current.grid.length, "rows");
      }
    } catch (e) {
      console.warn("Wind API failed, using fallback");
      vectorFieldRef.current = buildWindGrid(generateProceduralWind().vectors, {
        minLat: -90,
        maxLat: 90,
        minLng: -180,
        maxLng: 180,
      }, 40);
    }
  };

  // --------------------------
  // Procedural fallback
  // --------------------------
  const generateProceduralWind = () => ({
    vectors: Array(60)
      .fill(0)
      .map(() => ({
        lat: Math.random() * 180 - 90,
        lng: Math.random() * 360 - 180,
        u: Math.random() * 5 - 2,
        v: Math.random() * 5 - 2,
      })),
  });

  // --------------------------
  // Initialize particles
  // --------------------------
  const initializeParticles = (count) => {
    particlesRef.current = [];
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: Math.random(),
        y: Math.random(),
        age: Math.random() * 60,
        maxAge: 60,
        vx: 0,
        vy: 0,
      });
    }
  };

  // --------------------------
  // Build regular grid from scattered vectors
  // --------------------------
  const buildWindGrid = (vectors, bounds, gridSize = 40) => {
    const grid = [];
    const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
    const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;

    for (let gy = 0; gy <= gridSize; gy++) {
      const row = [];
      const lat = bounds.minLat + gy * latStep;
      for (let gx = 0; gx <= gridSize; gx++) {
        const lng = bounds.minLng + gx * lngStep;

        // Inverse Distance Weighting
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

  // --------------------------
  // Bilinear interpolation
  // --------------------------
  const getWindAtPoint = (lng, lat) => {
    const field = vectorFieldRef.current;
    if (!field || !field.grid) return { u: 0.5, v: 0.2 };

    const { grid, gridSize, bounds } = field;

    let x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * gridSize;
    let y = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * gridSize;

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

  // --------------------------
  // Animation loop with fading trails
  // --------------------------
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !map) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Fade trails without hiding the map
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.05)"; // low alpha
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    const boundsMap = map.getBounds();
    const sw = boundsMap.getSouthWest();
    const ne = boundsMap.getNorthEast();

    particlesRef.current.forEach((p) => {
      const lng = sw.lng + p.x * (ne.lng - sw.lng);
      const lat = sw.lat + p.y * (ne.lat - sw.lat);

      const wind = getWindAtPoint(lng, lat);

      const speedFactor = 0.0016;
      p.vx = wind.u * speedFactor;
      p.vy = -wind.v * speedFactor;

      p.x += p.vx;
      p.y += p.vy;
      p.age++;

      if (p.age > p.maxAge || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        p.x = Math.random();
        p.y = Math.random();
        p.age = 0;
      }

      const px = p.x * width;
      const py = p.y * height;

      ctx.beginPath();
      ctx.arc(px, py, 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  return null;
};

export default WindParticleLayer;
