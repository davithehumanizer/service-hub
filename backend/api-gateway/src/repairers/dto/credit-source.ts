import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * What repairers-service writes on a repairer proposed on the site: a
 * client sending it would pass its repairers off as the site's proposals.
 */
export const PROPOSAL_SOURCE = 'Service Hub';

/**
 * A repairer's source is the credit shown with it to the public, as the
 * licence of its data asks (ADEME, OpenStreetMap…), not a code: the
 * importers send those credits through this field.
 */
export const CreditSourceField = () =>
  applyDecorators(
    ApiProperty({
      description:
        'The credit shown with the repairer to the public: who its data comes from, as its licence asks. ' +
        'Keep the same text for every repairer of one source: removing a source’s repairers will rest on it. ' +
        `"${PROPOSAL_SOURCE}" is the hub’s own, for repairers proposed on its site (400).`,
      example: 'ACME Data – repairer directory',
      required: false,
    }),
    IsOptional(),
    IsString(),
    Matches(/^(?!\s*service\s+hub\s*$)/i, {
      message: `source "${PROPOSAL_SOURCE}" is the hub’s own`,
    }),
  );
