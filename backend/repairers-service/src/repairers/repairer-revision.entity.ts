import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Repairer } from './repairer.entity';
import { RepairerChanges } from './types/repairer-changes';

/**
 * A change its author made to a published repairer, waiting for an
 * administrator. One at most per repairer: a new change replaces it.
 */
@Entity('repairer_revisions')
@Index('repairer_revisions_one_pending_idx', ['repairer_id'], {
  unique: true,
  where: `"status" = 'pending'`,
})
export class RepairerRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repairer_id: string;

  @ManyToOne(() => Repairer, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'repairer_id',
    foreignKeyConstraintName: 'FK_repairer_revisions_repairer',
  })
  repairer: Repairer;

  /** The fields it changes, with their new values. */
  @Column({ type: 'jsonb' })
  changes: RepairerChanges;

  // 'pending' | 'applied' | 'rejected' — see constants/repairer-status.ts
  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'integer' })
  created_by: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  /** Why an administrator refused it, shown to its author. */
  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  @Column({ type: 'integer', nullable: true, select: false })
  reviewed_by: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;
}
