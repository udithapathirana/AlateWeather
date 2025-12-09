// frontend/src/components/UI/AlertNotification.jsx
import React from 'react';
import { Bell, X } from 'lucide-react';

export const AlertNotification = ({ alert, onClose }) => {
  return (
    <div className="bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Bell className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-400 mb-1">{alert.title}</h3>
            <p className="text-sm text-gray-300">{alert.message}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};