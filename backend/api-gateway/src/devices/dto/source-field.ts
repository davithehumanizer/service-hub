import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotIn, IsOptional, IsString, Matches } from 'class-validator';

/**
 * What the catalogue writes itself: by hand (MANUAL), Icecat's imports, and
 * the column's default. An outside source may not pass for one of them.
 */
export const RESERVED_SOURCES = ['MANUAL', 'ICECAT', 'UNKNOWN'];

/** The permission that lets a caller name the source of what it creates. */
export const SOURCE_PERMISSION = 'device.source.set';

/** The outside source a record comes from, sent by a client allowed to. */
export const SourceField = () =>
  applyDecorators(
    ApiProperty({
      description:
        'The outside source this comes from (e.g. ACME_DATA): capitals, digits and _, 32 at most; ' +
        `${RESERVED_SOURCES.join(', ')} are the catalogue's own. Needs the \`${SOURCE_PERMISSION}\` ` +
        'permission (403 otherwise). What a source creates is changed by an administrator only.',
      example: 'ACME_DATA',
      required: false,
    }),
    IsOptional(),
    IsString(),
    Matches(/^[A-Z][A-Z0-9_]{1,31}$/, {
      message: 'source must be capitals, digits and _, 2 to 32 long',
    }),
    IsNotIn(RESERVED_SOURCES, { message: 'source names one of the catalogue’s own' }),
  );
