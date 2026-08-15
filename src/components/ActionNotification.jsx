import React, { useEffect, useState } from 'react';
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ActionNotification({ isVisible, message, actionText, onAction, onClose }) {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShown(true);
      // Automatically close after 15 seconds
      const timer = setTimeout(() => {
        setIsShown(false);
        if (onClose) onClose();
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      setIsShown(false);
    }
  }, [isVisible, onClose]);

  // Animation to slide out before completely removing
  const handleClose = () => {
    setIsShown(false);
    // Small delay to allow animation to complete
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible && !isShown) return null;

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 backdrop-blur-md bg-white/90 dark:bg-[#1d2535]/90 rounded-xl shadow-2xl dark:shadow-[0_0_25px_rgba(0,0,0,0.5)] transition-all duration-300 transform ${isShown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ring-1 ring-gray-200 dark:ring-gray-700`}
      style={{ 
        maxWidth: '320px',
        boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3), 0 10px 20px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)'
      }}
    >
      <div className="py-3 px-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
            Kopyalama Tamamlandı
          </h3>
          <button 
            onClick={handleClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a3241]/60 transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          {message}
        </div>
        
        <button
          onClick={() => {
            if (onAction) onAction();
            handleClose();
          }}
          className="w-full flex items-center justify-center space-x-1 py-2 rounded-lg bg-gradient-to-r from-[#0071e3] to-[#0090ff] hover:from-[#0077ed] hover:to-[#00a0ff] text-white text-xs font-medium transition-all duration-200"
        >
          <span>{actionText}</span>
          <ArrowRightIcon className="w-3 h-3 ml-1" />
        </button>
      </div>
    </div>
  );
} 