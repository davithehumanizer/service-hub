import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { PARTNER_TYPE_WHITELIST } from '../constants/partner-type-whitelist';
import { DEVICE_TYPE_WHITELIST } from '../constants/device-type-whitelist';

/**
 * A repairer proposed on the site. Who proposes it, and whether it waits for
 * an administrator, come from the session, never from the body.
 */
export class ProposeRepairerDto {
  static name = 'Repairer.Propose';

  @ApiProperty({ example: 'Repair Café Lille-Fives' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ example: '18 rue Pierre Legrand' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ example: '59800' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string | null;

  @ApiProperty({ example: 'Lille' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code', example: 'FR' })
  @IsString()
  @IsUppercase()
  @Length(2, 2)
  country: string;

  @ApiPropertyOptional({ example: 'https://repaircafe-lille.fr' })
  @IsOptional()
  // With its scheme: without one, a link to it would be relative to the site.
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(255)
  website?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiProperty({ description: 'Where its pin goes', example: 50.6292 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 3.0573 })
  @IsLongitude()
  longitude: number;

  @ApiProperty({ enum: PARTNER_TYPE_WHITELIST })
  @IsIn(PARTNER_TYPE_WHITELIST)
  partner_type: string;

  @ApiProperty({
    description: 'Every device type it repairs; replaces the previous list.',
    type: [String],
    enum: DEVICE_TYPE_WHITELIST,
  })
  @IsArray()
  @ArrayMaxSize(DEVICE_TYPE_WHITELIST.length)
  @IsIn(DEVICE_TYPE_WHITELIST, { each: true })
  device_types: string[];
}

/** Only what changes. A required field cannot be emptied (400). */
export class ChangeRepairerProposalDto extends PartialType(ProposeRepairerDto) {
  static name = 'Repairer.ProposalChange';
}

export class ReviewRepairerProposalDto {
  static name = 'Repairer.ProposalReview';

  @ApiProperty({ enum: ['publish', 'reject'] })
  @IsIn(['publish', 'reject'])
  decision: 'publish' | 'reject';

  @ApiProperty({
    description:
      'The `version` the queue gave: a proposal its author changed since is ' +
      'refused (409), not reviewed unseen.',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({ description: 'Why it is refused, shown to its author.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewRepairerRevisionDto {
  static name = 'Repairer.RevisionReview';

  @ApiProperty({ enum: ['apply', 'reject'] })
  @IsIn(['apply', 'reject'])
  decision: 'apply' | 'reject';

  @ApiPropertyOptional({ description: 'Why it is refused, shown to its author.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
