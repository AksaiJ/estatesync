import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'confirm' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl transform transition-all scale-100 opacity-100 border border-gray-100">
        <div className="flex items-center mb-4">
          {type === 'alert' ? (
            <div className="bg-blue-50 p-2 rounded-full mr-3">
              <Info className="text-blue-500" size={24} />
            </div>
          ) : (
            <div className="bg-red-50 p-2 rounded-full mr-3">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          {type === 'confirm' && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-white font-medium rounded-lg transition shadow-sm ${type === 'alert' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
