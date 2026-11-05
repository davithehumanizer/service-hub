import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_technical_properties')
export class DeviceTechnicalProperty {
  @PrimaryGeneratedColumn()
  property_id: number;

  @Index()
  @ManyToOne(() => Device, (device) => device.technicalProperties, {
    onDelete: 'CASCADE',
  })
  device: Device;

  @Column()
  property_name: string;

  @Column()
  property_value: string;
}
