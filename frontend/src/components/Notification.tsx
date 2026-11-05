import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // Duration in milliseconds (default: 5000)
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const {theme} = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) {
    return null;
  }

  let bgColor = 'bg-blue-500';
  let textColor = 'text-white';
  let icon = 'ℹ️'; // Default info icon
  let borderColor = 'border-blue-700'; // Default border color
  let iconColor = 'text-white'; // Default icon color
  let shadow = 'shadow-lg';

  switch (type) {
    case 'success':
      bgColor = isDarkMode ? 'bg-gray-800' : 'bg-green-100';
      icon = '✅';
      textColor = isDarkMode ? 'text-white' : 'text-green-900';
      borderColor = isDarkMode ? 'border-green-700' : 'border-green-400';
      iconColor = isDarkMode ? 'text-white' : 'text-green-700';
      break;
    case 'error':
      bgColor = isDarkMode ? 'bg-gray-800' : 'bg-red-100';
      icon = '❌';
      borderColor = isDarkMode ? 'border-red-700' : 'border-red-400';
      textColor = isDarkMode ? 'text-white' : 'text-red-900';
      iconColor = isDarkMode ? 'text-white' : 'text-red-700';
      shadow = 'shadow-lg';
      break;
    case 'warning':
      bgColor = isDarkMode ? 'bg-gray-800' : 'bg-yellow-100';
      textColor = isDarkMode ? 'text-white' : 'text-yellow-900';
      icon = '⚠️';
      borderColor = isDarkMode ? 'border-yellow-700' : 'border-yellow-400';
      iconColor = isDarkMode ? 'text-yellow-200' : 'text-yellow-700';
      break;
    case 'info':
      bgColor = isDarkMode ? 'bg-gray-800' : 'bg-blue-100';
      textColor = isDarkMode ? 'text-white' : 'text-blue-900';
      icon = 'ℹ️';
      borderColor = isDarkMode ? 'border-blue-700' : 'border-blue-400';
      iconColor = isDarkMode ? 'text-white' : 'text-blue-700';
      break;
    default:
      break;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${bgColor} ${textColor} p-4 rounded-md ${shadow} flex items-center space-x-2 border-2 ${borderColor}`}
    >
      <span className={`text-xl ${iconColor}`}>{icon}</span>
      <p className="text-sm">{message}</p>
      <button
        className="ml-auto focus:outline-none"
        onClick={handleClose}
        aria-label="Close"
      >
        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default Notification;
