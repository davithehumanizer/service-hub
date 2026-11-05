import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEVICE_TYPE_WHITELIST } from '../repairers/constants/device-type-whitelist';

/**
 * Normalizes `repairer_devices.device_type` values to the canonical slug
 * whitelist (see `DEVICE_TYPE_WHITELIST`).
 *
 * Rationale (PBI 13759): production data audit (data/device_type_counts.csv)
 * showed the column historically stored a mix of human-readable Title Case
 * labels (e.g. "Home Appliance") and a handful of raw lowercase/typo slugs
 * (e.g. "smartphone", "headphone", "smartwatche"). No genuinely invalid
 * (out-of-whitelist) values were found in the audited export, so this
 * migration only remaps/consolidates known variants; the final DELETE is
 * a defensive safety net expected to affect 0 rows.
 *
 * Consolidations applied (per confirmed decisions):
 * - "Smart Phone / Pager" and "Mobile phone / Cell phone" -> smartphone
 * - "Desktop computer" / "desktop" -> desktop_computer
 * - "Headphones" / "headphone" -> headphones
 * - "smartwatche" (negligible real volume) -> wrist_watch
 */
export class NormalizeRepairerDeviceTypes1764100000000
  implements MigrationInterface
{
  name = 'NormalizeRepairerDeviceTypes1764100000000';

  /**
   * Maps every raw `device_type` value observed in production
   * (data/device_type_counts.csv) to its canonical slug.
   */
  private readonly remap: Record<string, string> = {
    'Home Appliance': 'home_appliance',
    Audio: 'audio',
    'LED Lamp': 'led_lamp',
    'Other Electronics': 'other_electronics',
    'Personal Computer': 'personal_computer',
    'Photo camera': 'photo_camera',
    'Power supply': 'power_supply',
    Monitor: 'monitor',
    'Fridge / combi freezer': 'fridge_combi_freezer',
    'Bicycle battery': 'bicycle_battery',
    'Power Tool': 'power_tool',
    Toy: 'toy',
    'Electric guitar': 'electric_guitar',
    'Smart Phone / Pager': 'smartphone',
    'Wrist watch': 'wrist_watch',
    'Kitchen Appliance': 'kitchen_appliance',
    Bicycle: 'bicycle',
    Battery: 'battery',
    'Solar panel': 'solar_panel',
    Laptop: 'laptop',
    'Desktop computer': 'desktop_computer',
    'Mobile phone / Cell phone': 'smartphone',
    Tablet: 'tablet',
    'Small Kitchen Item': 'small_kitchen_item',
    'Hearing aid': 'hearing_aid',
    'DVD player / recorder': 'dvd_player_recorder',
    'Large Home Electrical': 'large_home_electrical',
    'Other Textile': 'other_textile',
    Amplifier: 'amplifier',
    Dress: 'dress',
    Jacket: 'jacket',
    Trousers: 'trousers',
    Skirt: 'skirt',
    'Blouse Shirt': 'blouse_shirt',
    Jumper: 'jumper',
    'Drip coffee maker': 'drip_coffee_maker',
    Iron: 'iron',
    Toaster: 'toaster',
    'Hair dryer': 'hair_dryer',
    Kettle: 'kettle',
    Fan: 'fan',
    'Hairbeauty Item': 'hairbeauty_item',
    'E Bikes': 'e_bikes',
    'Bed Linen': 'bed_linen',
    'Tv Or Gaming Related Accessory': 'tv_or_gaming_related_accessory',
    'Portable radio': 'portable_radio',
    Headphones: 'headphones',
    'Vacuum cleaner': 'vacuum_cleaner',
    Blender: 'blender',
    'Air conditioner': 'air_conditioner',
    'Printer / Copier / Scanner': 'printer_copier_scanner',
    Shoes: 'shoes',
    'PC accessory': 'pc_accessory',
    'Handheld Entertainment Device': 'handheld_entertainment_device',
    'Digital compact camera': 'digital_compact_camera',
    'Video camera': 'video_camera',
    'Sewing machine': 'sewing_machine',
    Projector: 'projector',
    Lamp: 'lamp',
    'Decorative Or Safety Light': 'decorative_or_safety_light',
    'Gaming Console': 'gaming_console',
    'Battery charger': 'battery_charger',
    'Musical Instrument': 'musical_instrument',
    'Paper shredder': 'paper_shredder',
    Other: 'other',
    Leather: 'leather',
    Furniture: 'furniture',
    'Clothing Textiles': 'clothing_textiles',
    'Electronic Gadgets': 'electronic_gadgets',
    'Thuis Entertainment': 'thuis_entertainment',
    'Other Category': 'other_category',
    Steps: 'steps',
    smartphone: 'smartphone',
    tablet: 'tablet',
    laptop: 'laptop',
    Printer: 'printer',
    headphone: 'headphones',
    'vacuum cleaner': 'vacuum_cleaner',
    smartwatche: 'wrist_watch',
    desktop: 'desktop_computer',
    'small appliance': 'small_appliance',
    charger: 'charger',
    printer: 'printer',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [oldValue, newValue] of Object.entries(this.remap)) {
      if (oldValue === newValue) {
        continue;
      }
      await queryRunner.query(
        `UPDATE repairer_devices SET device_type = $1 WHERE device_type = $2`,
        [newValue, oldValue],
      );
    }

    // Defensive safety net: remove any remaining rows outside the final
    // whitelist. Expected to affect 0 rows based on the production audit.
    const placeholders = DEVICE_TYPE_WHITELIST.map(
      (_, index) => `$${index + 1}`,
    ).join(', ');
    await queryRunner.query(
      `DELETE FROM repairer_devices WHERE device_type NOT IN (${placeholders})`,
      [...DEVICE_TYPE_WHITELIST],
    );
  }

  public async down(): Promise<void> {
    // Data normalization is not reversible (original casing/variants are lost).
  }
}
