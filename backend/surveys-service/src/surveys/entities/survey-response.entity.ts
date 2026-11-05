import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surveyId: string;

  @Column({ nullable: true })
  userId: string; // Optional, if anonymous

  @Column('jsonb')
  answers: any;

  // Correlation IDs for logging
  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  traceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
