import { useEffect, useState } from "react";
import { Device } from "../models/device";
import { deviceService } from "../services/deviceService";
import { searchCategory } from "../utils/tutorialsPath";

/**
 * Whether iFixit has tutorials for the device, or for a model with no
 * variant: null while asking, or with neither. Brand and category, or the
 * probe answers on the model alone and disables the button for every
 * appliance iFixit knows only by category.
 */
export function useHasTutorials(
  device: Pick<Device, "brand" | "model" | "categories"> | null,
): boolean | null {
  const [hasTutorials, setHasTutorials] = useState<boolean | null>(null);

  useEffect(() => {
    setHasTutorials(null);
    if (!device) return;
    let current = true;
    deviceService
      .searchIfixit(
        device.model,
        "",
        "",
        "",
        device.brand,
        searchCategory(device.categories),
        device.categories?.[0]?.ifixit_wikiid ?? undefined,
      )
      .then((response) => {
        const results = response?.data?.results ?? response?.data ?? response ?? [];
        if (current) setHasTutorials(Array.isArray(results) ? results.length > 0 : false);
      })
      .catch(() => current && setHasTutorials(false));
    return () => {
      current = false;
    };
  }, [device]);

  return hasTutorials;
}
