import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { VisualCondition } from './enums/visual-condition.enum';
import { UsageIntensity } from './enums/usage-intensity.enum';

/**
 * A personal device: the one a user owns, of a device model, and of one of
 * its variants when known. An owner may have two identical ones.
 */
@Entity('ownerships')
export class Ownership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Devices are listed by owner, which the unique (userId, deviceId) indexed.
  @Index()
  @Column()
  userId: number; // UUID ou autre identifiant, dépend de ton user-service

  @Column({ type: 'int', nullable: true })
  modelId: number | null;

  @Column({ type: 'int', nullable: true })
  deviceId: number | null; // La variante, quand elle est connue

  /** Tells two identical devices apart. */
  @Column({ type: 'varchar', nullable: true })
  nickname: string | null;

  /** The current state, which each repair journey updates. */
  @Column({ default: VisualCondition.Unknown, enum: VisualCondition })
  visualCondition: string;

  @Column({ default: UsageIntensity.Unknown, enum: UsageIntensity })
  usageIntensity: string;

  @Column()
  acquiredAt: Date;
}
