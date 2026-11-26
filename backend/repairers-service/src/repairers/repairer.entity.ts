import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  AfterLoad,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RepairerDevice } from './repairer-device.entity';
import { getCountryName } from '../utils/country-mapper';
import { DEFAULT_PARTNER_TYPE } from './constants/partner-type-whitelist';
import { PUBLISHED } from './constants/repairer-status';

@Entity('repairers')
// The administrators' queue and "my repairers": a few rows among thousands.
@Index('repairers_unpublished_idx', ['status'], {
  where: `"status" <> 'published'`,
})
@Index('repairers_created_by_idx', ['created_by'], {
  where: `"created_by" IS NOT NULL`,
})
export class Repairer {
  @PrimaryGeneratedColumn('uuid')
  repairer_id: string;

  @Column({ nullable: true })
  repairer_import_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  address: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  postal_code: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ default: 'UNKNOWN', nullable: true }) // Peut être 'CSV', 'API', 'Manuel'
  source: string;

  // 'repairer' | 'recycler' | 'other' | 'both' | 'reuse' | 'repairer_reuse'
  // — see partner-type-whitelist.ts
  @Column({ default: DEFAULT_PARTNER_TYPE })
  partner_type: string;

  /** The user who created it; null for an import. Not read back: the
   * repairer is public, its author is not. */
  @Column({ type: 'integer', nullable: true, select: false })
  created_by: number | null;

  /** Created by a contributor: demonstration data, purged with them. */
  @Column({ default: false })
  is_demo: boolean;

  // 'pending' | 'published' | 'rejected' — see constants/repairer-status.ts.
  // Only a published repairer is shown; imports are published at once.
  @Column({ default: PUBLISHED })
  status: string;

  /** Why an administrator refused it, shown to its author. */
  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  @Column({ type: 'integer', nullable: true, select: false })
  reviewed_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  /** Null for the repairers there before it was recorded. */
  @CreateDateColumn({ type: 'timestamptz', nullable: true })
  created_at: Date | null;

  /** Virtual field: populated after load via @AfterLoad, not stored in DB */
  countryName?: string;

  @AfterLoad()
  populateCountryName() {
    this.countryName = getCountryName(this.country);
  }

  @OneToMany(
    () => RepairerDevice,
    (repairerDevice) => repairerDevice.repairer,
    { cascade: true },
  )
  repairerDevices: RepairerDevice[];
}
