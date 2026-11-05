import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Repairer } from './repairer.entity';

@Entity('repairer_devices')
export class RepairerDevice {
  @PrimaryGeneratedColumn()
  repairer_device_id: number;

  @ManyToOne(() => Repairer, (repairer) => repairer.repairerDevices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'repairer_id' }) // ✅ Clé étrangère
  repairer: Repairer;

  @Column()
  device_type: string; // Ex: "smartphones", "tablets", "computers"
}
