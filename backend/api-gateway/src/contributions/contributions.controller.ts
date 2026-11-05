import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import { authorOf } from 'src/auth/author';
import { ContributionsPageDto, ContributionsQueryDto } from './contributions.dto';

/** What the signed-in user entered in the catalogue, to find it again. */
@ApiTags('Contributions')
@Controller('contributions')
export class ContributionsController {
  private readonly logger = new Logger(ContributionsController.name);

  constructor(
    @Inject('DEVICES_SERVICE') private readonly devices: ClientProxy,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('user.me')
  @ApiBearerAuth()
  @Version('1')
  @Get('mine')
  @ApiOperation({
    summary: 'The models, or the variants, I entered',
    description: 'Newest first, a page at a time.',
  })
  @ApiResponse({ status: 200, type: ContributionsPageDto })
  @ApiResponse({ status: 401, description: 'Not signed in.' })
  async mine(
    @Query() query: ContributionsQueryDto,
    @Req() req: any,
  ): Promise<ContributionsPageDto> {
    const { created_by } = authorOf(req);
    if (created_by === null) {
      throw new HttpException('Sign in to see your contributions', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await firstValueFrom(
        this.devices.send(
          { cmd: 'entries_of_author' },
          { authorId: created_by, kind: query.kind, offset: query.offset, limit: query.limit },
        ),
      );
    } catch (error) {
      this.logger.error('entries_of_author error', error?.stack, error);
      throw new HttpException(
        error?.message || 'Failed to read your contributions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
