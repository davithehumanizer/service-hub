import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveApiToolDto {
  static name = 'ApiCatalog.Approve';

  @ApiPropertyOptional({
    description:
      'Whether this tool should be flagged as a community contribution. Defaults to true.',
  })
  @IsOptional()
  @IsBoolean()
  isCommunity?: boolean;
}
