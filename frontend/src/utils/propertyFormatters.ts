export const formatPropertyName = (name: string): string => {
  // Convert snake_case or camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

export const groupByCategory = <T extends { property_name: string; property_value: string }>(
  properties: T[]
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};
  
  properties.forEach(prop => {
    const category = categorizeTechnicalProperty(prop.property_name);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(prop);
  });
  
  return grouped;
};

export const categorizeTechnicalProperty = (propertyName: string): string => {
  const name = propertyName.toLowerCase();
  
  if (name.includes('display') || name.includes('screen') || name.includes('resolution')) 
    return 'Display';
  if (name.includes('processor') || name.includes('cpu') || name.includes('frequency') || name.includes('cores')) 
    return 'Processor';
  if (name.includes('ram') || name.includes('memory') || name.includes('storage')) 
    return 'Storage';
  if (name.includes('camera') || name.includes('photo') || name.includes('video')) 
    return 'Camera';
  if (name.includes('battery') || name.includes('charging')) 
    return 'Battery';
  if (name.includes('wifi') || name.includes('bluetooth') || name.includes('nfc') || name.includes('connectivity')) 
    return 'Connectivity';
  if (name.includes('dimension') || name.includes('weight') || name.includes('size') || name.includes('height') || name.includes('width') || name.includes('depth')) 
    return 'Design';
  if (name.includes('usb') || name.includes('port') || name.includes('jack') || name.includes('connector')) 
    return 'Ports & Interfaces';
    
  return 'Other';
};
