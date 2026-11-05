export const categoryDisplayer = (categoryName: string): string => {
  switch (categoryName) {
    case "device_type":
      return "Device Type";

    case "country":
      return "Country";

    default:
      break;
  }
  return categoryName;
};
