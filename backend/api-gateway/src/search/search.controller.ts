import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { GlobalSearchResultDto } from './dto/global-search-result.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @ApiOperation({
    summary:
      'Performs a global search across device models, repairers, and spare parts',
    description:
      'Device models come one per model, and a barcode or a reference finds its model.',
  })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, type: [GlobalSearchResultDto] })
  async globalSearch(
    @Query('q') query: string,
  ): Promise<GlobalSearchResultDto[]> {
    return this.searchService.globalSearch(query);
  }
}
