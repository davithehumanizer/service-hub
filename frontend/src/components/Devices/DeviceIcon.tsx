// frontend/src/components/Devices/DeviceIcon.tsx
import React from 'react';

interface DeviceIconProps {
  deviceType: string;
  className?: string;
}

const DeviceIcon: React.FC<DeviceIconProps> = ({ deviceType, className }) => {
  const getIconName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'computer monitor':
        return 'desktop_windows';
      case 'console':
        return 'stadia_controller';
      case 'digital camera':
        return 'photo_camera';
      case 'dishwasher':
        return 'dishwasher';
      case 'drill':
        return 'hardware';
      case 'electric toothbrush':
        return 'dentistry';
      case 'fan':
        return 'air';
      case 'food processor':
        return 'blender';
      case 'headphones':
        return 'headphones';
      case 'laptop':
        return 'laptop_mac';
      case 'printer':
        return 'print';
      case 'robot vacuum':
        return 'robot';
      case 'router':
        return 'router';
      case 'smart speaker':
        return 'speaker';
      case 'smartphone':
        return 'smartphone';
      case 'smartwatch':
        return 'watch';
      case 'tablet':
        return 'tablet_mac';
      case 'washing machine':
        return 'local_laundry_service';
      default:
        return 'devices';
    }
  };

  return (
    <span className={`material-symbols-outlined ${className}`}>
      {getIconName(deviceType)}
    </span>
  );
};

export default DeviceIcon;
