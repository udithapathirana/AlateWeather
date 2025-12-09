// frontend/src/components/Sidebar/CountrySelector.jsx
import React from 'react';
import { Globe } from 'lucide-react';

const COUNTRIES = [
  { 
    code: 'US', 
    name: 'United States',
    center: [-95, 40],
    bounds: { minLat: 25, maxLat: 49, minLng: -125, maxLng: -66 }
  },
  { 
    code: 'GB', 
    name: 'United Kingdom',
    center: [-2, 54],
    bounds: { minLat: 50, maxLat: 59, minLng: -8, maxLng: 2 }
  },
  { 
    code: 'AU', 
    name: 'Australia',
    center: [133, -25],
    bounds: { minLat: -44, maxLat: -10, minLng: 113, maxLng: 154 }
  },
  { 
    code: 'JP', 
    name: 'Japan',
    center: [138, 36],
    bounds: { minLat: 24, maxLat: 46, minLng: 123, maxLng: 146 }
  },
  { 
    code: 'BR', 
    name: 'Brazil',
    center: [-55, -10],
    bounds: { minLat: -34, maxLat: 5, minLng: -74, maxLng: -34 }
  },
  { 
    code: 'IN', 
    name: 'India',
    center: [77, 20],
    bounds: { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 }
  },
  { 
    code: 'DE', 
    name: 'Germany',
    center: [10, 51],
    bounds: { minLat: 47, maxLat: 55, minLng: 6, maxLng: 15 }
  },
  { 
    code: 'CA', 
    name: 'Canada',
    center: [-106, 56],
    bounds: { minLat: 42, maxLat: 70, minLng: -141, maxLng: -52 }
  }
];

const CountrySelector = ({ selectedCountry, onSelectCountry }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Globe className="w-5 h-5 text-blue-400" />
        Select Country
      </h2>
      <select 
        value={selectedCountry?.code || ''}
        onChange={(e) => {
          const country = COUNTRIES.find(c => c.code === e.target.value);
          if (country) onSelectCountry(country);
        }}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
      >
        <option value="">Choose a country...</option>
        {COUNTRIES.map(country => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      
      {selectedCountry && (
        <div className="mt-3 p-3 bg-gray-900 rounded-lg text-sm">
          <div className="text-gray-400">Selected:</div>
          <div className="text-white font-semibold">{selectedCountry.name}</div>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;