import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GlobalSearchResultDto } from './dto/global-search-result.dto';

/**
 * The search box across the site: device models, from devices-service,
 * which knows how to search them (identifiers included); repairers, from
 * their index; spare parts, from their service. Each source that fails is
 * left out rather than failing the others.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @Optional()
    @Inject('SPARE_PARTS_SERVICE')
    private readonly sparePartsClient: ClientProxy,
    @Optional()
    @Inject('DEVICES_SERVICE')
    private readonly devicesClient: ClientProxy,
  ) {}

  async globalSearch(query: string): Promise<GlobalSearchResultDto[]> {
    if (!query) return [];

    const [models, repairers, spareParts] = await Promise.all([
      this.searchModels(query),
      this.searchRepairers(query),
      this.searchSpareParts(query),
    ]);

    return [...models, ...repairers, ...spareParts];
  }

  /** One result per device model, no longer one per catalogue entry. */
  private async searchModels(query: string): Promise<GlobalSearchResultDto[]> {
    if (!this.devicesClient) return [];
    try {
      const result: any = await firstValueFrom(
        this.devicesClient.send(
          { cmd: 'get_device_models' },
          { query: { search: query, limit: 5 } },
        ),
      );
      return (result?.data ?? []).map((model: any) => ({
        id: String(model.id),
        type: 'device-model',
        title: `${model.brand} ${model.name}`.trim(),
        subtitle: model.categories?.[0]?.name ?? '',
        thumbnail: model.thumbnail || undefined,
        // A barcode or a reference names a variant too: decision 11.
        link: result.variant
          ? `/app/model/${model.id}?variant=${result.variant.device_id}`
          : `/app/model/${model.id}`,
      }));
    } catch (error) {
      this.logger.error(
        `Device model search in global search failed: ${error?.message}`,
      );
      return [];
    }
  }

  private async searchRepairers(
    query: string,
  ): Promise<GlobalSearchResultDto[]> {
    try {
      // @ts-ignore - The client types for nested queries can be complex
      const result = await this.elasticsearchService.search({
        index: 'repairers',
        query: {
          multi_match: {
            query,
            fields: [
              'title^3',
              'name^3',
              'model^2',
              'brand',
              'description',
              'category',
            ],
            fuzziness: 'AUTO',
          },
        },
      });

      // @ts-ignore
      const hits = result.hits?.hits || [];

      return hits.map((hit: any) => {
        const source = hit._source;

        return {
          id: hit._id,
          type: 'repairer',
          title: source.title || source.name || source.model || 'Unknown',
          subtitle:
            source.brand || source.category || source.city || source.address,
          description: source.description,
          thumbnail:
            source.thumbnail || source.image || source.logo || source.photo_url,
          link: `/app/repairer/${hit._id}`,
          score: hit._score,
        };
      });
    } catch (error) {
      this.logger.error(`Elasticsearch global search failed: ${error.message}`);
      return [];
    }
  }

  private async searchSpareParts(
    query: string,
  ): Promise<GlobalSearchResultDto[]> {
    if (!this.sparePartsClient) return [];
    try {
      const result: any = await firstValueFrom(
        this.sparePartsClient.send(
          { cmd: 'spare-parts-search' },
          { q: query, limit: 5 },
        ),
      );
      const hits: any[] = result?.hits || [];
      return hits.map((hit: any) => ({
        id: hit.objectID ?? hit.id?.toString() ?? '',
        type: 'spare-part',
        title: hit.model?.name || 'Spare Part',
        subtitle: hit.model?.brand?.name || hit.model?.type?.name || '',
        description: hit.status?.name || '',
        thumbnail: '',
        link: `/app/spare-parts/${hit.objectID}`,
        score: hit._rankingScore ?? 0,
      }));
    } catch (error) {
      this.logger.error(
        `Spare parts search in global search failed: ${error?.message}`,
      );
      return [];
    }
  }
}
