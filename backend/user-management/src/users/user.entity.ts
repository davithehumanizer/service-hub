import { Role } from 'src/roles/role.entity';
import { UserProfile } from 'src/user-profile/user-profile.entity';
import { RepairerProfile } from 'src/repairer-profile/repairer-profile.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ManyToOne(() => Role, { eager: true })
  role: Role;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp',
    nullable: true,
  })
  updated_at: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, type: 'varchar' })
  confirmationToken?: string | null;

  @Column({ nullable: true })
  resetToken?: string;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;

  @OneToOne(() => RepairerProfile, (rp) => rp.user, {
    nullable: true,
    eager: false,
  })
  repairerProfile?: RepairerProfile;
}
