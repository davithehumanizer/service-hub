import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DeviceCategory } from './device-category.entity';

@Entity('device_category_translations')
@Unique(['category', 'locale'])
export class DeviceCategoryTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DeviceCategory, (c) => c.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: DeviceCategory;

  @Column({ length: 5 })
  locale: string;

  @Column()
  translated_name: string;
}
