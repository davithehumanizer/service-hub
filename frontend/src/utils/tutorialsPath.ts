import { Device } from "../models/device";

/**
 * The category as iFixit can read it. `name` comes translated: "Aspirateur
 * robot" found nothing where "Robotic vacuum cleaner" can.
 */
export const searchCategory = (
  categories?: { name: string; canonicalName?: string }[] | null,
): string | undefined => categories?.[0]?.canonicalName ?? categories?.[0]?.name;

/**
 * The tutorials page reads brand and category from the global device, which
 * only the wizard sets — arriving from a device or model page it had neither,
 * and fell back to the model alone. Carry them in the URL. Models hold
 * spaces, brackets and slashes, so the segment must be encoded.
 */
export const tutorialsPath = (
  device: Pick<Device, "brand" | "model" | "categories">,
): string => {
  const params = new URLSearchParams();
  if (device.brand) {
    params.set("brand", device.brand);
  }
  const category = searchCategory(device.categories);
  if (category) {
    params.set("category", category);
  }
  const wikiId = device.categories?.[0]?.ifixit_wikiid;
  if (wikiId) {
    params.set("categoryWikiId", wikiId);
  }
  const query = params.toString();
  return `/app/ifixit-tutorials/${encodeURIComponent(device.model)}${query ? `?${query}` : ""}`;
};
