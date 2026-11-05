/**
 * Global color definitions for the application
 * These colors are used consistently across different components
 */

export const toolColors = {
  // Repair Journey - Green theme
  repairJourney: {
    primary: 'customgreen',
    light: 'customgreen-100',
    dark: 'customgreen-900/30',
    text: 'customgreen-600',
    textDark: 'customgreen-400',
    hover: 'customgreen-50',
    hoverDark: 'customgreen-900/20',
    border: 'customgreen-500',
    bg: 'from-customgreen-100 to-customgreen-200',
    bgDark: 'from-customgreen-900/30 to-customgreen-800/30'
  },
  
  // Device Library - Blue theme
  devices: {
    primary: 'blue',
    light: 'blue-100',
    dark: 'blue-900/30',
    text: 'blue-600',
    textDark: 'blue-400',
    hover: 'blue-50',
    hoverDark: 'blue-900/20',
    border: 'blue-500',
    bg: 'from-blue-100 to-blue-200',
    bgDark: 'from-blue-900/30 to-blue-800/30'
  },
  
  // Repair Map - Purple theme
  repairMap: {
    primary: 'purple',
    light: 'purple-100',
    dark: 'purple-900/30',
    text: 'purple-600',
    textDark: 'purple-400',
    hover: 'purple-50',
    hoverDark: 'purple-900/20',
    border: 'purple-500',
    bg: 'from-purple-100 to-purple-200',
    bgDark: 'from-purple-900/30 to-purple-800/30'
  },
  
  // Video Tutorials - Orange theme
  tutorials: {
    primary: 'orange',
    light: 'orange-100',
    dark: 'orange-900/30',
    text: 'orange-600',
    textDark: 'orange-400',
    hover: 'orange-50',
    hoverDark: 'orange-900/20',
    border: 'orange-500',
    bg: 'from-orange-100 to-orange-200',
    bgDark: 'from-orange-900/30 to-orange-800/30'
  },
  
  // Impact Calculator - Green theme (different from repair journey)
  impactCalculator: {
    primary: 'green',
    light: 'green-100',
    dark: 'green-900/30',
    text: 'green-600',
    textDark: 'green-400',
    hover: 'green-50',
    hoverDark: 'green-900/20',
    border: 'green-500',
    bg: 'from-green-100 to-green-200',
    bgDark: 'from-green-900/30 to-green-800/30'
  },
  
  // Home - Default theme
  home: {
    primary: 'customgreen',
    light: 'customgreen-100',
    dark: 'customgreen-900/30',
    text: 'customgreen-600',
    textDark: 'customgreen-400',
    hover: 'customgreen-50',
    hoverDark: 'customgreen-900/20',
    border: 'customgreen-500',
    bg: 'from-customgreen-100 to-customgreen-200',
    bgDark: 'from-customgreen-900/30 to-customgreen-800/30'
  }
} as const;

/**
 * Get color theme for a specific tool/route
 */
export const getToolColors = (routeName: string) => {
  switch (routeName) {
    case 'Home':
      return toolColors.home;
    case 'Repair Journey':
      return toolColors.repairJourney;
    case 'Devices':
      return toolColors.devices;
    case 'Repair Map':
      return toolColors.repairMap;
    case 'Tutorials':
      return toolColors.tutorials;
    case 'Impact calculator':
      return toolColors.impactCalculator;
    default:
      return toolColors.home;
  }
};

export type ToolColorKey = keyof typeof toolColors;