import { Device } from "../models/device";
import { IdentificationResult } from "../models/identification";

/**
 * Maps an identification result from the photo identification service to a partial Device object.
 * This creates a device with the identified information, using defaults for missing fields.
 *
 * @param result - The identification result from the API
 * @returns A partial Device object that can be used in the wizard workflow
 */
export function mapIdentificationToDevice(
  result: IdentificationResult,
): Partial<Device> {
  return {
    device_id: "", // Will be assigned by backend on creation
    ean: result.GTIN || "",
    serial_number: "", // To be filled by user later
    manufacturer: result.Brand, // Using Brand as manufacturer fallback
    brand: result.Brand,
    model: result.Model,
    device_type: result.Product,
    categories: [], // To be mapped/selected by user
    source: "Photo Identification",
    technicalProperties: [],
    informationalProperties: result.ReleaseDate
      ? [
          {
            property_id: "release_date",
            property_name: "Release Date",
            property_value: result.ReleaseDate,
          },
          ...(result.EndOfLifeDate
            ? [
                {
                  property_id: "end_of_life_date",
                  property_name: "End of Life Date",
                  property_value: result.EndOfLifeDate,
                },
              ]
            : []),
        ]
      : [],
  };
}
