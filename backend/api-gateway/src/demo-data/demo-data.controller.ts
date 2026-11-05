/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import { StorageService } from 'src/storage/storage.service';
import {
  ContributorStatsDto,
  DemoDataReportDto,
  PurgeDemoDataDto,
} from './demo-data.dto';
import {
  ContributionsPageDto,
  ContributorEntriesQueryDto,
} from 'src/contributions/contributions.dto';

/**
 * The one purge of demonstration data: what contributors entered, what
 * names it — real users' ownerships and journeys included —, then their
 * accounts (docs/demo-data.md, §4.4). Each step removes what is still
 * there, so a purge stopped halfway is finished by running it again.
 */
@ApiTags('Demo data')
@Controller('admin/demo-data')
export class DemoDataController {
  private readonly logger = new Logger(DemoDataController.name);

  constructor(
    @Inject('USER_SERVICE') private readonly users: ClientProxy,
    @Inject('DEVICES_SERVICE') private readonly devices: ClientProxy,
    @Inject('REPAIRERS_SERVICE') private readonly repairers: ClientProxy,
    private readonly storage: StorageService,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('demo_data.purge')
  @ApiBearerAuth()
  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'What a purge of demonstration data would remove (admin)',
  })
  @ApiResponse({ status: 200, type: DemoDataReportDto })
  async preview(): Promise<DemoDataReportDto> {
    return this.run(true);
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('contributor.admin')
  @ApiBearerAuth()
  @Version('1')
  @Get('contributors/:id')
  @ApiOperation({
    summary: "A contributor's account and what it entered (admin)",
    description:
      'Its share of what the purge would remove, by the same rules, and ' +
      'the repairers it proposed by status.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ContributorStatsDto })
  @ApiResponse({ status: 404, description: 'No contributor account with that id.' })
  async contributor(@Param('id', ParseIntPipe) id: number): Promise<ContributorStatsDto> {
    const contributors: any[] = await this.step(true, 'account lookup', this.users, 'get_contributors', {});
    const account = contributors.find((c) => c.id === id);
    if (!account) throw new NotFoundException('No contributor account with that id');
    const [catalogue, repairers] = await Promise.all([
      this.step(true, 'catalogue', this.devices, 'demo_stats_of_contributor', {
        contributorId: id,
        email: account.email,
      }),
      this.step(true, 'repairers', this.repairers, 'demo_repairer_stats_of_contributor', {
        contributorId: id,
      }),
    ]);
    return {
      contributor: {
        id,
        email: account.email,
        firstName: account.profile?.firstName ?? null,
        lastName: account.profile?.lastName ?? null,
        language: account.profile?.language ?? null,
        created_at: account.created_at,
      },
      catalogue,
      repairers,
    };
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('contributor.admin')
  @ApiBearerAuth()
  @Version('1')
  @Get('contributors/:id/entries')
  @ApiOperation({
    summary: 'What a contributor entered, a page at a time (admin)',
    description:
      'Its models or its variants, newest first; or all its repairers, ' +
      'with their status.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ContributionsPageDto })
  @ApiResponse({ status: 404, description: 'No contributor account with that id.' })
  async contributorEntries(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ContributorEntriesQueryDto,
  ): Promise<ContributionsPageDto> {
    const contributors: any[] = await this.step(true, 'account lookup', this.users, 'get_contributors', {});
    if (!contributors.some((c) => c.id === id)) {
      throw new NotFoundException('No contributor account with that id');
    }
    if (query.kind === 'repairers') {
      const items: any[] = await this.step(true, 'repairers', this.repairers, 'get_repairers_of_author', {
        authorId: id,
      });
      return { items, total: items.length };
    }
    return this.step(true, 'catalogue', this.devices, 'entries_of_author', {
      authorId: id,
      kind: query.kind,
      offset: query.offset,
      limit: query.limit,
    });
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('demo_data.purge')
  @ApiBearerAuth()
  @Version('1')
  @Post('purge')
  @ApiOperation({
    summary: 'Purge the demonstration data and the contributor accounts (admin)',
    description:
      'Irreversible: take a dump first. Catalogue and what names it go in ' +
      'one transaction, then the repairers, the photo files and the ' +
      'accounts. A purge stopped on an error is finished by running it again.',
  })
  @ApiBody({ type: PurgeDemoDataDto })
  @ApiResponse({ status: 201, type: DemoDataReportDto })
  @ApiResponse({ status: 400, description: 'Not confirmed with PURGE.' })
  @ApiResponse({
    status: 500,
    description: 'Stopped at the step named; what is done stays done.',
  })
  async purge(@Body() _confirmed: PurgeDemoDataDto): Promise<DemoDataReportDto> {
    const report = await this.run(false);
    this.logger.log('Demo data purged', {
      event: 'demo_data_purged',
      category: 'demo_data',
      ...report,
    });
    return report;
  }

  private async run(dryRun: boolean): Promise<DemoDataReportDto> {
    const { ids, emails } = await this.step(
      dryRun,
      'account lookup',
      this.users,
      'purge_contributors',
      { dryRun: true },
    );
    if (!dryRun) {
      await this.step(dryRun, 'sessions', this.users, 'revoke_contributor_sessions', { ids });
    }
    const catalogue = await this.step(dryRun, 'catalogue', this.devices, 'purge_demo_catalogue', {
      contributorIds: ids,
      contributorEmails: emails,
      dryRun,
    });
    // At once: the rows are gone, and a second run would not name them again.
    // A file left behind is reported, not fatal.
    let filesLeft = 0;
    for (const key of dryRun ? [] : (catalogue.photoKeys as string[])) {
      try {
        await this.storage.deleteFile(key);
      } catch (error) {
        filesLeft += 1;
        this.logger.error(`Photo file not deleted: ${key}`, error?.stack);
      }
    }
    const { repairers } = await this.step(dryRun, 'repairers', this.repairers, 'purge_demo_repairers', {
      dryRun,
    });
    const report: DemoDataReportDto = {
      accounts: ids.length,
      ...catalogue.report,
      repairers,
    };
    if (dryRun) return report;

    await this.step(dryRun, 'accounts', this.users, 'purge_contributors', { dryRun: false, ids });
    return { ...report, filesLeft };
  }

  private async step(
    dryRun: boolean,
    name: string,
    client: ClientProxy,
    cmd: string,
    payload: unknown,
  ): Promise<any> {
    try {
      return await firstValueFrom(client.send({ cmd }, payload));
    } catch (error) {
      const reason = error?.message ?? 'unknown error';
      this.logger.error(`Demo data ${dryRun ? 'preview' : 'purge'} failed at ${name}`, error?.stack, error);
      throw new HttpException(
        dryRun
          ? `Preview failed at ${name}: ${reason}. Nothing was removed.`
          : `Purge stopped at ${name}: ${reason}. ` +
              'What was done stays done; run it again to finish.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
