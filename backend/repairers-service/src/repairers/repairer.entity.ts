import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  AfterLoad,
} from 'typeorm';
import { RepairerDevice } from './repairer-device.entity';
import { getCountryName } from '../utils/country-mapper';
import { DEFAULT_PARTNER_TYPE } from './constants/partner-type-whitelist';

@Entity('repairers')
export class Repairer {
  @PrimaryGeneratedColumn('uuid')
  repairer_id: string;

  @Column({ nullable: true })
  repairer_import_id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  address: string;

  @Column()
  country: string;

  @Column()
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
