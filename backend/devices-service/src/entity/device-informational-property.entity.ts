import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_informational_properties')
export class DeviceInformationalProperty {
  @PrimaryGeneratedColumn()
  property_id: number;

  @Index()
  @ManyToOne(() => Device, (device) => device.informationalProperties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column()
  property_name: string;

  @Column()
  property_value: string;
}
