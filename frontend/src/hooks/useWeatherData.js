// frontend/src/hooks/useWeatherData.js
import { useState, useEffect, useCallback } from 'react';
import { weatherAPI } from '../services/api';

const useWeatherData = (country, activeFilters) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!country) {
      setWeatherData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeLayers = Object.entries(activeFilters)
        .filter(([_, active]) => active)
        .map(([key]) => key);

      if (activeLayers.length === 0) {
        setWeatherData(null);
        setLoading(false);
        return;
      }

      const response = await weatherAPI.getCountryWeather(
        country.code,
        activeLayers
      );

      if (response.success) {
        setWeatherData(response.data);
      } else {
        throw new Error('Failed to fetch weather data');
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [country, activeFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    weatherData,
    loading,
    error,
    refetch
  };
};

export default useWeatherData;