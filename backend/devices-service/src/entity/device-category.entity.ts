import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  AfterInsert,
} from 'typeorm';
import { Device } from './device.entity';
import { DeviceCategoryTranslation } from './device-category-translation.entity';

@Entity('device_categories')
export class DeviceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  urn: string;

  /**
   * The category's name. **Overwritten with the caller's locale** on the way
   * out, so it is a label, not an identifier — see {@link canonicalName}.
   */
  @Column({ unique: true })
  name: string;

  /**
   * The untranslated name, carried alongside the translated one so callers
   * have something stable to key on.
   *
   * Not a column: it is filled in when a payload is localised. Without it,
   * anything that matched on `name` silently stopped working outside English —
   * which is exactly what happened to the repair-impact lookup.
   */
  canonicalName?: string;

  @Column({ nullable: true })
  unukey: string;

  @Column({ default: false })
  is_electrical: boolean;

  @Column({ type: 'varchar', nullable: true, unique: true })
  ifixit_wikiid: string | null;

  @ManyToMany(() => Device, (device) => device.categories)
  devices: Device[];

  @OneToMany(() => DeviceCategoryTranslation, (t) => t.category)
  translations: DeviceCategoryTranslation[];

  @AfterInsert()
  async generateUrn() {
    // Generate URN after insert when id is available
    this.urn = `urn:care2repair:category:${this.id}`;
    // Note: The URN will be persisted by the service layer after insert
  }
}
