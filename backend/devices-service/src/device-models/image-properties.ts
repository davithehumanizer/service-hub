/**
 * Where Icecat put the product's pictures, best first: a model's
 * representative is a variant with one, and its thumbnail the first found.
 */
export const IMAGE_PROPERTIES = [
  'Image_HighPic',
  'Image_Pic500x500',
  'Image_LowPic',
  'Image_ThumbPic',
  'HighPic',
  'FullImage',
];

/**
 * SQL for the thumbnail of the model aliased `model`: its representative's
 * first Icecat picture, else a photo uploaded for it, else one of the model
 * itself; IMAGE_PROPERTIES being passed as the parameter `images`.
 */
export const thumbnailSql = (model: string, images: string) => `
  coalesce(
    (SELECT p.property_value FROM device_informational_properties p
      WHERE p.device_id = ${model}.representative_device_id
        AND p.property_name = ANY(${images}::text[])
      ORDER BY array_position(${images}::text[], p.property_name::text)
      LIMIT 1),
    (SELECT ph.url FROM device_photos ph
      WHERE ph.device_id = ${model}.representative_device_id
      ORDER BY ph.created_at, ph.id LIMIT 1),
    (SELECT ph.url FROM device_model_photos ph
      WHERE ph.model_id = ${model}.id
      ORDER BY ph.created_at, ph.id LIMIT 1))`;
