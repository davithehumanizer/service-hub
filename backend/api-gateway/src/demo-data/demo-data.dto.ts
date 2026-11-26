import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** The word an administrator types: a purge is not undone. */
export class PurgeDemoDataDto {
  static name = 'DemoData.Purge';

  @ApiProperty({ enum: ['PURGE'], description: 'Must be exactly PURGE.' })
  @IsIn(['PURGE'])
  confirm: 'PURGE';
}

/** What the purge removes, or would: how many of each. */
export class DemoDataReportDto {
  static name = 'DemoData.Report';

  @ApiProperty({ description: 'Contributor accounts, deleted last.' })
  accounts: number;

  @ApiProperty({ description: 'Demo models, without any real variant.' })
  models: number;

  @ApiProperty({
    description: 'Demo models a real variant joined: kept, as real ones.',
  })
  adoptedModels: number;

  @ApiProperty()
  variants: number;

  @ApiProperty({
    description: 'Photo rows and files: demo ones, and any on what goes.',
  })
  photos: number;

  @ApiProperty({
    description: 'Real models losing demo variants or photos: recomputed.',
  })
  touchedModels: number;

  @ApiProperty()
  ownerships: number;

  @ApiProperty({ description: 'Of the ownerships, real users’ ones.' })
  realOwnerships: number;

  @ApiProperty()
  journeys: number;

  @ApiProperty({ description: 'Of the journeys, real users’ or guests’.' })
  realJourneys: number;

  @ApiProperty({ description: 'Repair records of those journeys or users.' })
  records: number;

  @ApiProperty({ description: 'Of the records, real users’ or guests’.' })
  realRecords: number;

  @ApiProperty({ description: 'Tutorial subscriptions to what goes.' })
  subscriptions: number;

  @ApiProperty()
  repairers: number;

  @ApiProperty({
    description: 'After a purge: photo files that could not be deleted.',
    required: false,
  })
  filesLeft?: number;
}

/** One contributor's share of what the purge would remove. */
export class ContributorCatalogueDto extends OmitType(DemoDataReportDto, [
  'accounts',
  'repairers',
  'filesLeft',
] as const) {
  static name = 'DemoData.ContributorCatalogue';
}

export class ContributorRepairersDto {
  static name = 'DemoData.ContributorRepairers';

  @ApiProperty({ description: 'Every repairer this account proposed.' })
  repairers: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  published: number;

  @ApiProperty()
  rejected: number;

  @ApiProperty({ description: 'Its changes to published repairers, waiting.' })
  revisions: number;
}

export class ContributorAccountDto {
  static name = 'DemoData.ContributorAccount';

  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  firstName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  lastName?: string | null;

  @ApiProperty({
    description: 'Language of its emails: en, fr, nl or de.',
    required: false,
    nullable: true,
  })
  language?: string | null;

  @ApiProperty()
  created_at: string;
}

export class ContributorStatsDto {
  static name = 'DemoData.ContributorStats';

  @ApiProperty({ type: ContributorAccountDto })
  contributor: ContributorAccountDto;

  @ApiProperty({ type: ContributorCatalogueDto })
  catalogue: ContributorCatalogueDto;

  @ApiProperty({ type: ContributorRepairersDto })
  repairers: ContributorRepairersDto;
}
