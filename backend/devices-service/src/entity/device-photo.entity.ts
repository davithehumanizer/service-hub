import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_photos')
export class DevicePhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // A model's thumbnail looks its representative's photos up.
  @Index()
  @Column({ name: 'device_id' })
  deviceId: number;

  @ManyToOne(() => Device, (device) => device.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column()
  key: string;

  @Column()
  url: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
