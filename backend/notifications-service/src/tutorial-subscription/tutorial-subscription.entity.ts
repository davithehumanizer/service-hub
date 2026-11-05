import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tutorial_subscriptions')
export class TutorialSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: number;

  /** Tutorials are written per model: a subscription waits on one. */
  @Column({ nullable: true })
  modelId?: number;

  @Column({ nullable: true })
  deviceId?: string;

  @Column('simple-array', { nullable: true })
  issueTypes?: string[];

  @Column()
  email: string;

  @Column()
  locale: string;

  @CreateDateColumn()
  createdAt: Date;
}
