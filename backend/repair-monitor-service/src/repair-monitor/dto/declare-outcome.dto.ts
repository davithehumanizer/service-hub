import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { JourneyOutcome } from '../enums/journey-outcome.enum';
import { RepairBarrier } from '../enums/repair-barrier.enum';
import { SolutionTag } from '../enums/solution-tag.enum';

export class DeclareOutcomeDto {
  /**
   * Absent only when a signed-in user owns the journey; the service refuses the
   * call when neither the token nor ownership holds.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declarationToken?: string;

  @IsEnum(JourneyOutcome)
  outcome: JourneyOutcome;

  /** Only meaningful when the repair did not succeed. */
  @IsOptional()
  @IsEnum(RepairBarrier)
  repairBarrier?: string;

  /** Only meaningful when it did. */
  @IsOptional()
  @IsEnum(SolutionTag)
  solutionTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  repairSolution?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  yearOfManufacture?: number;
}
