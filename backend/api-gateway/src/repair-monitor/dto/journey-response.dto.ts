import { ApiProperty } from '@nestjs/swagger';
import { ProblemTagDto, RepairRouteDto } from './create-repair-journey.dto';
import { RepairStatusDto } from './create-repair-record.dto';
import { RepairBarrierDto, SolutionTagDto } from './declare-outcome.dto';

export class CreatedJourneyDto {
  static name = 'RepairMonitor.CreatedJourney';

  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'The secret that lets this browser declare the outcome and list the journey. Returned only here.',
  })
  declarationToken: string;

  @ApiProperty({ type: String, format: 'date-time' })
  tokenExpiresAt: Date;
}

/** A journey as its owner sees it: never with its declaration token. */
export class JourneySummaryDto {
  static name = 'RepairMonitor.JourneySummary';

  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The catalogue variant, when one was named',
  })
  deviceId: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'The device model; null for a device described by its category alone, or typed in by hand',
  })
  modelId: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'The personal device the journey is in the history of',
  })
  ownershipId: string | null;

  @ApiProperty({ type: String, nullable: true })
  brand: string | null;

  @ApiProperty({ type: String, nullable: true })
  modelType: string | null;

  @ApiProperty({ type: String, nullable: true })
  productCategory: string | null;

  @ApiProperty({ enum: ProblemTagDto, nullable: true })
  problemTag: ProblemTagDto | null;

  @ApiProperty({ enum: RepairRouteDto, nullable: true })
  repairRoute: RepairRouteDto | null;

  @ApiProperty({ type: [String] })
  issues: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  journeyDate: Date;

  @ApiProperty({ enum: ['Pending', 'Declared'] })
  status: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  declaredAt: Date | null;

  @ApiProperty({
    enum: RepairStatusDto,
    nullable: true,
    description: 'Once declared',
  })
  outcome: RepairStatusDto | null;

  @ApiProperty({ enum: SolutionTagDto, nullable: true })
  solutionTag: SolutionTagDto | null;

  @ApiProperty({ enum: RepairBarrierDto, nullable: true })
  repairBarrier: RepairBarrierDto | null;

  @ApiProperty({ type: String, nullable: true })
  eventDate: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'kg of CO2e the repair avoided, frozen when the outcome was declared. Null means unknown, never zero.',
  })
  co2Avoided: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The reference category the figure came from',
  })
  co2ReferenceCategory: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'How many products that reference averaged',
  })
  co2ReferenceProducts: number | null;
}
