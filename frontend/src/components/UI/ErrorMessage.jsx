// frontend/src/components/UI/ErrorMessage.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-400 mb-1">Error</h3>
          <p className="text-sm text-gray-300">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};