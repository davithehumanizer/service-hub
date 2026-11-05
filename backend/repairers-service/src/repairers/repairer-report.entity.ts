import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Repairer } from './repairer.entity';
import { DEFAULT_REPAIRER_REPORT_STATUS } from './constants/repairer-report-status';

/**
 * A user-submitted report flagging a repairer result as irrelevant
 * (e.g. "this is not a repairer"). PBI 13762.
 */
@Entity('repairer_reports')
export class RepairerReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repairer_id: string;

  @ManyToOne(() => Repairer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repairer_id' })
  repairer: Repairer;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  // 'pending' | 'reviewed' | 'dismissed' — see constants/repairer-report-status.ts
  @Column({ default: DEFAULT_REPAIRER_REPORT_STATUS })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
