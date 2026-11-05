export interface DeviceOptionSelect {
  group: string;
  items: { label: string; value: string }[];
}

export const ITEMS_PER_PAGE_OPTIONS = ["12", "24", "48", "96"];

export const getCategoryIcon = (categoryName: string): string => {
  const lowername = categoryName.toLowerCase();

  // Mobile & Phones
  if (lowername.includes("phone") || lowername.includes("mobile"))
    return "smartphone";

  // Computing
  if (
    lowername.includes("laptop") ||
    lowername.includes("notebook") ||
    lowername.includes("macbook")
  )
    return "laptop_mac";
  if (lowername.includes("tablet") || lowername.includes("ipad"))
    return "tablet_mac";
  if (
    lowername.includes("desktop") ||
    lowername.includes("pc") ||
    lowername.includes("computer") ||
    lowername.includes("workstation") ||
    lowername.includes("all-in-one")
  )
    return "desktop_windows";
  if (
    lowername.includes("printer") ||
    lowername.includes("copier") ||
    lowername.includes("scanner") ||
    lowername.includes("fax")
  )
    return "print";
  if (
    lowername.includes("network") ||
    lowername.includes("router") ||
    lowername.includes("switch") ||
    lowername.includes("wifi")
  )
    return "router";
  if (
    lowername.includes("keyboard") ||
    lowername.includes("mouse") ||
    lowername.includes("touchpad")
  )
    return "keyboard";
  if (
    lowername.includes("drive") ||
    lowername.includes("disk") ||
    lowername.includes("storage")
  )
    return "hard_drive";

  // AV & Entertainment
  if (
    lowername.includes("tv") ||
    lowername.includes("television") ||
    lowername.includes("display") ||
    lowername.includes("monitor") ||
    lowername.includes("screen") ||
    lowername.includes("projector") ||
    lowername.includes("beamer")
  )
    return "tv";
  if (lowername.includes("watch") || lowername.includes("wearable"))
    return "watch";
  if (
    lowername.includes("camera") ||
    lowername.includes("photo") ||
    lowername.includes("video") ||
    lowername.includes("camcorder")
  )
    return "photo_camera";
  if (
    lowername.includes("audio") ||
    lowername.includes("speaker") ||
    lowername.includes("sound") ||
    lowername.includes("radio") ||
    lowername.includes("stereo") ||
    lowername.includes("amplifier") ||
    lowername.includes("receiver") ||
    lowername.includes("tuner") ||
    lowername.includes("hifi") ||
    lowername.includes("player") ||
    lowername.includes("recorder") ||
    lowername.includes("microphone")
  )
    return "speaker";
  if (
    lowername.includes("headphone") ||
    lowername.includes("headset") ||
    lowername.includes("earbud")
  )
    return "headphones";
  if (
    lowername.includes("console") ||
    lowername.includes("game") ||
    lowername.includes("gaming") ||
    lowername.includes("playstation") ||
    lowername.includes("wii") ||
    lowername.includes("nintendo") ||
    lowername.includes("xbox")
  )
    return "videogame_asset";

  // Home Appliances
  if (
    lowername.includes("cleaner") ||
    lowername.includes("vacuum") ||
    lowername.includes("washer") ||
    lowername.includes("washing") ||
    lowername.includes("dryer") ||
    lowername.includes("dishwasher") ||
    lowername.includes("steam")
  )
    return "cleaning_services"; // or local_laundry_service for washing
  if (
    lowername.includes("fridge") ||
    lowername.includes("freezer") ||
    lowername.includes("cooler") ||
    lowername.includes("refrigerator") ||
    lowername.includes("ice")
  )
    return "kitchen";
  if (lowername.includes("coffee") || lowername.includes("espresso"))
    return "coffee_maker";
  if (lowername.includes("microwave")) return "microwave";
  if (
    lowername.includes("oven") ||
    lowername.includes("stove") ||
    lowername.includes("cooker") ||
    lowername.includes("range") ||
    lowername.includes("grill") ||
    lowername.includes("toaster") ||
    lowername.includes("fryer") ||
    lowername.includes("kettle") ||
    lowername.includes("blender") ||
    lowername.includes("mixer") ||
    lowername.includes("processor") ||
    lowername.includes("juicer") ||
    lowername.includes("kitchen")
  )
    return "kitchen";

  if (lowername.includes("iron")) return "iron";
  if (
    lowername.includes("fan") ||
    lowername.includes("air") ||
    lowername.includes("heater") ||
    lowername.includes("humidifier") ||
    lowername.includes("cooler") ||
    lowername.includes("conditioning") ||
    lowername.includes("thermostat")
  )
    return "mode_fan";
  if (
    lowername.includes("light") ||
    lowername.includes("lamp") ||
    lowername.includes("bulb") ||
    lowername.includes("led")
  )
    return "lightbulb";

  // Tools & Garden
  if (
    lowername.includes("drill") ||
    lowername.includes("saw") ||
    lowername.includes("sander") ||
    lowername.includes("grinder") ||
    lowername.includes("tool") ||
    lowername.includes("screwdriver") ||
    lowername.includes("cutter") ||
    lowername.includes("pump") ||
    lowername.includes("mower")
  )
    return "construction";
  if (lowername.includes("garden") || lowername.includes("plant"))
    return "yard";

  // Mobility
  if (lowername.includes("bike") || lowername.includes("bicycle"))
    return "pedal_bike";
  if (
    lowername.includes("scooter") ||
    lowername.includes("hoverboard") ||
    lowername.includes("rollator")
  )
    return "electric_scooter";
  // A whole word: "personal care" and "cartridge" are not cars.
  if (/\bcars?\b/.test(lowername) || lowername.includes("vehicle"))
    return "directions_car";
  if (lowername.includes("drone")) return "flight";

  // Others
  if (
    lowername.includes("toy") ||
    lowername.includes("doll") ||
    lowername.includes("bear") ||
    lowername.includes("robot")
  )
    return "smart_toy";
  if (
    lowername.includes("battery") ||
    lowername.includes("charger") ||
    lowername.includes("power")
  )
    return "battery_charging_full";
  if (lowername.includes("clock") || lowername.includes("alarm"))
    return "alarm";
  if (
    lowername.includes("musical") ||
    lowername.includes("instrument") ||
    lowername.includes("guitar") ||
    lowername.includes("piano")
  )
    return "music_note";

  return "devices"; // default
};
