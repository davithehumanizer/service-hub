import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Device } from './device.entity';
import { DeviceCategory } from './device-category.entity';
import { DeviceModelPhoto } from './device-model-photo.entity';

/**
 * A device model ("Samsung Galaxy S23"): what a user picks. Its catalogue
 * entries are its variants (colour, storage, seller); a model created by hand
 * can have none.
 */
@Entity('device_models')
export class DeviceModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('device_models_brand_idx')
  @Column()
  brand: string;

  @Column()
  name: string;

  /** Normalised brand and name (normalizeModel): the model's identity. */
  @Index('device_models_key_unique_idx', { unique: true })
  @Column()
  key: string;

  @Column({ default: 0 })
  variant_count: number;

  /** The variant the model is shown with. */
  @Column({ type: 'integer', nullable: true })
  representative_device_id: number | null;

  /** False when only resellers list it: ranked after manufacturers' models. */
  @Column({ default: false })
  has_manufacturer_variant: boolean;

  /**
   * Created by hand rather than by the assignment: kept with no variant,
   * and with the categories it was given.
   */
  @Column({ default: false })
  is_manual: boolean;

  /**
   * The colours its variants come in, as Icecat names them ("Black",
   * "Aluminium,Black"): swatches on the search result when there are two.
   */
  @Column('varchar', { array: true, default: '{}' })
  colours: string[];

  @ManyToMany(() => DeviceCategory)
  @JoinTable({
    name: 'device_model_categories',
    joinColumn: { name: 'model_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: DeviceCategory[];

  @OneToMany(() => Device, (device) => device.deviceModel)
  variants: Device[];

  @OneToMany(() => DeviceModelPhoto, (photo) => photo.model)
  photos: DeviceModelPhoto[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
