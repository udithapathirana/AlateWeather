// frontend/src/components/UI/LoadingSpinner.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
};