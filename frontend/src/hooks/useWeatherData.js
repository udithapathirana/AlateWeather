// frontend/src/hooks/useWeatherData.js
import { useState, useEffect, useCallback } from "react";
import { weatherAPI } from "../services/api";

const useWeatherData = (country, activeFilters) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!activeFilters) return;

    const layers = Object.entries(activeFilters)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (layers.length === 0) {
      setWeatherData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = {};

      for (const layer of layers) {
        const response = await weatherAPI.getGlobalWeatherLayer(layer);
        results[layer] = response.data;
      }

      setWeatherData(results);
    } catch (err) {
      console.error("Error loading global weather:", err);
      setError("Failed to load global weather");
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { weatherData, loading, error, refetch: fetchData };
};

export default useWeatherData;
