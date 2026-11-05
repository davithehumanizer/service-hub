import { Device } from '../models/device';

/**
 * Icecat exposes the same picture in several sizes. Ordered from the largest
 * usable one down, because the properties come back in insertion order and
 * picking the first match landed on a thumbnail as often as on a full picture.
 */
const DEVICE_IMAGE_PROPERTIES = [
  'FullImage',
  'Full Image',
  'HighPic',
  'image',
  'Image_HighPic',
  'Image_Pic500x500',
  'Image_LowPic',
  'Image_ThumbPic',
];

/**
 * Every picture we can try for a device, best first: the Icecat sizes, then the
 * photos uploaded for that device, then its model's. Icecat drops files without
 * notice, so the list is a cascade, not a single choice.
 */
export const deviceImageUrls = (
  device?: Pick<Device, 'informationalProperties' | 'photos' | 'thumbnail'> | null,
): string[] => {
  if (!device) {
    return [];
  }

  const fromIcecat = DEVICE_IMAGE_PROPERTIES.map(
    (name) =>
      device.informationalProperties?.find((p) => p.property_name === name)
        ?.property_value,
  );
  const fromPhotos = device.photos?.map((photo) => photo.url) ?? [];

  return [...fromIcecat, ...fromPhotos, device.thumbnail].filter(
    (url): url is string => !!url && url.trim().length > 0,
  );
};
