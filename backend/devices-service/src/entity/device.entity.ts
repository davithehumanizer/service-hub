import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  JoinTable,
  AfterInsert,
  getRepository,
  Index,
} from 'typeorm';
import { DeviceTechnicalProperty } from './device-technical-property.entity';
import { DeviceCategory } from './device-category.entity';
import { DeviceInformationalProperty } from './device-informational-property.entity';
import { DevicePhoto } from './device-photo.entity';
import { DeviceModel } from './device-model.entity';

@Entity('devices')
// Only what was entered by hand has an author: a small index.
@Index('devices_created_by_idx', ['created_by'], {
  where: '"created_by" IS NOT NULL',
})
export class Device {
  @PrimaryGeneratedColumn()
  device_id: number;

  @Column({ unique: true, nullable: true })
  urn: string;

  @Index('devices_ean_unique_idx', { unique: true, where: "ean != ''" })
  @Column()
  ean: string;

  @Index('devices_serial_number_unique_idx', {
    unique: true,
    where: "serial_number != ''",
  })
  @Column({ default: '' })
  serial_number: string;

  @Index('devices_product_code_unique_idx', {
    unique: true,
    where: "product_code != ''",
  })
  @Column({ default: '' })
  product_code: string;

  @Index('devices_manufacturer_idx')
  @Column()
  manufacturer: string;

  @Index('devices_brand_idx')
  @Column()
  brand: string;

  @Index('devices_model_idx')
  @Column()
  model: string;

  @ManyToMany(() => DeviceCategory, (category) => category.devices, {
    cascade: true,
  })
  @JoinTable({ name: 'device_category_device_link' })
  categories: DeviceCategory[];

  @Index('devices_device_type_idx')
  @Column()
  device_type: string;

  /**
   * The model this entry is a variant of; null until it is assigned. Not
   * `model`, which is the entry's own model name.
   */
  @ManyToOne(() => DeviceModel, (deviceModel) => deviceModel.variants, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'model_id' })
  deviceModel: DeviceModel | null;

  @Index('devices_model_id_idx')
  @Column({ type: 'integer', nullable: true })
  model_id: number | null;

  /** What tells this variant apart from the others: "256 GB, Black". */
  @Column({ type: 'varchar', nullable: true })
  variant_label: string | null;

  /** The label's parts by key, { storage: "256 GB", colour: "Black" }. */
  @Column({ type: 'jsonb', nullable: true, select: false })
  variant_parts: Record<string, string> | null;

  @Column({ default: false })
  is_refurbished: boolean;

  /** The user who entered it; null for an import. Not read back: the
   * entry is public, its author is not. */
  @Column({ type: 'integer', nullable: true, select: false })
  created_by: number | null;

  /** Created by a contributor: demonstration data, purged with them. */
  @Column({ default: false })
  is_demo: boolean;

  @Index('devices_source_idx')
  @Column({ default: 'UNKNOWN' }) // Peut être 'CSV', 'API', 'Manuel'
  source: string;

  @Column({ nullable: true })
  import_id: string; // ID du lot d'import (ex: "icecat-2023-11-19-001")

  @Column({ type: 'timestamp', nullable: true })
  import_date: Date;

  @Index('devices_source_id_idx')
  @Column({ nullable: true })
  source_id: string; // ID externe (ex: Icecat ID "12345")

  //   @ManyToMany(() => UserDevice, (userDevice) => userDevice.device)
  //   @JoinTable()
  //   users: UserDevice[];

  //   @OneToMany(() => MaintenanceLog, (maintenanceLog) => maintenanceLog.device)
  //   maintenanceLogs: MaintenanceLog[];

  //   @OneToMany(() => RepairLog, (repairLog) => repairLog.device)
  //   repairLogs: RepairLog[];

  @OneToMany(
    () => DeviceTechnicalProperty,
    (deviceTechnicalProperty) => deviceTechnicalProperty.device,
    { cascade: true },
  )
  technicalProperties: DeviceTechnicalProperty[];

  @OneToMany(
    () => DeviceInformationalProperty,
    (deviceInformationalProperty) => deviceInformationalProperty.device,
    { cascade: true },
  )
  informationalProperties: DeviceInformationalProperty[];

  @OneToMany(() => DevicePhoto, (photo) => photo.device)
  photos: DevicePhoto[];

  @AfterInsert()
  async generateUrn() {
    // Generate URN after insert when device_id is available
    this.urn = `urn:care2repair:device:${this.device_id}`;
    // Note: The URN will be persisted by the service layer after insert
  }
}
