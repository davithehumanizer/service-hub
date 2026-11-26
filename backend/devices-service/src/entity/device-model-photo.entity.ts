import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { DeviceModel } from './device-model.entity';

/** A picture of the model itself: shown when no variant has one. */
@Entity('device_model_photos')
export class DeviceModelPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'model_id' })
  modelId: number;

  @ManyToOne(() => DeviceModel, (model) => model.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'model_id' })
  model: DeviceModel;

  @Column()
  key: string;

  @Column()
  url: string;

  /** The user who uploaded it. */
  @Column({
    name: 'created_by',
    type: 'integer',
    nullable: true,
    select: false,
  })
  createdBy: number | null;

  /** Uploaded by a contributor: demonstration data, purged with them. */
  @Column({ name: 'is_demo', default: false })
  isDemo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
