/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getCountryName } from '../utils/country-mapper';

@Injectable()
export class RepairerSearchService {
  private readonly logger = new Logger(RepairerSearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async indexRepairer(repairer: any) {
    try {
      await this.elasticsearchService.index({
        index: 'repairers',
        id: repairer.repairer_id.toString(),
        document: {
          name: repairer.name,
          description: repairer.description || '',
          city: repairer.city || '',
          country: repairer.country || '',
          countryName: getCountryName(repairer.country || ''),
          category: 'Repairer',
          logo_url: repairer.logo_url || '',
          rating: repairer.rating || 0,
          repairer_id: repairer.repairer_id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to index repairer ${repairer.repairer_id}: ${error.message}`,
      );
    }
  }

  async removeRepairer(repairerId: string) {
    try {
      await this.elasticsearchService.delete({
        index: 'repairers',
        id: repairerId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete repairer ${repairerId}: ${error.message}`,
      );
    }
  }

  async searchRepairersPaginated(
    query: string,
    from: number,
    size: number,
    filters?: { country?: string; device_type?: string },
  ) {
    const must: any[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          // countryName allows searching "France" to match repairers with country="FR"
          fields: ['name^3', 'description', 'city^2', 'countryName'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    // Apply country filter using the ISO code stored in the index
    if (filters?.country) {
      must.push({
        term: { 'country.keyword': filters.country.toUpperCase() },
      });
    }

    const result = await this.elasticsearchService.search({
      index: 'repairers',
      from,
      size,
      // Elasticsearch stops counting at 10 000 unless asked not to, and returns
      // that as the total. The home page reads this number and announced
      // "10 000 repairers" against the 33 782 actually imported — a round,
      // entirely believable figure, wrong by a factor of three, with nothing to
      // suggest it was a ceiling rather than a count.
      track_total_hits: true,
      query: {
        bool: { must },
      },
    });

    return {
      hits: result.hits.hits,
      total:
        typeof result.hits.total === 'number'
          ? result.hits.total
          : (result.hits.total as any)?.value || 0,
    };
  }
}
