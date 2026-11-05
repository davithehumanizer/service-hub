import React from 'react';
import { Accordion } from '@mantine/core';
import { 
  ComputerDesktopIcon, 
  CpuChipIcon, 
  CircleStackIcon,
  CameraIcon,
  BoltIcon,
  WifiIcon,
  RectangleGroupIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import PropertyCard from './PropertyCard';
import { groupByCategory } from '../../utils/propertyFormatters';

interface PropertyAccordionProps {
  properties: Array<{ property_name: string; property_value: string; property_id?: string }>;
}

const getCategoryIcon = (category: string): React.ReactNode => {
  const iconClass = "w-5 h-5";
  
  switch (category) {
    case 'Display':
      return <ComputerDesktopIcon className={iconClass} />;
    case 'Processor':
      return <CpuChipIcon className={iconClass} />;
    case 'Storage':
      return <CircleStackIcon className={iconClass} />;
    case 'Camera':
      return <CameraIcon className={iconClass} />;
    case 'Battery':
      return <BoltIcon className={iconClass} />;
    case 'Connectivity':
      return <WifiIcon className={iconClass} />;
    case 'Design':
      return <RectangleGroupIcon className={iconClass} />;
    case 'Ports & Interfaces':
      return <CubeIcon className={iconClass} />;
    default:
      return <CubeIcon className={iconClass} />;
  }
};

const PropertyAccordion: React.FC<PropertyAccordionProps> = ({ properties }) => {
  const grouped = groupByCategory(properties);
  
  // Sort categories: put "Other" last
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
  
  return (
    <Accordion 
      variant="separated" 
      multiple
      defaultValue={sortedCategories}
      className="space-y-2"
    >
      {sortedCategories.map((category) => (
        <Accordion.Item key={category} value={category}>
          <Accordion.Control icon={getCategoryIcon(category)}>
            <span className="font-semibold">{category}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({grouped[category].length})
            </span>
          </Accordion.Control>
          <Accordion.Panel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {grouped[category].map((prop, index) => (
                <PropertyCard 
                  key={prop.property_id || `${category}-${index}`} 
                  property={prop} 
                />
              ))}
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export default PropertyAccordion;
