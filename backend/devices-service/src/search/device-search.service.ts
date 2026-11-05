import { Injectable, Logger } from '@nestjs/common';
import { gtinVariants } from './gtin';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class DeviceSearchService {
  private readonly logger = new Logger(DeviceSearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Build ES document from device entity
   */
  private buildDeviceDocument(device: any): Record<string, any> {
    return {
      title: `${device.brand} ${device.model}`,
      brand: device.brand,
      model: device.model,
      category: device.device_type,
      description: device.description || '',
      ean: device.ean || '',
      serial_number: device.serial_number || '',
      product_code: device.product_code || '',
      category_names: device.categories?.map((c: any) => c.name) || [],
      thumbnail: this.extractThumbnail(device),
      device_id: device.device_id,
    };
  }

  async indexDevice(device: any) {
    try {
      await this.elasticsearchService.index({
        index: 'devices',
        id: device.device_id.toString(),
        document: this.buildDeviceDocument(device),
      });
    } catch (error) {
      this.logger.error(
        `Failed to index device ${device.device_id}: ${error.message}`,
      );
    }
  }

  /**
   * Bulk index multiple devices at once using ES bulk API.
   * Much more efficient than indexing one by one for large datasets.
   */
  async bulkIndexDevices(
    devices: any[],
  ): Promise<{ indexed: number; errors: number }> {
    if (devices.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    const operations = devices.flatMap((device) => [
      { index: { _index: 'devices', _id: device.device_id.toString() } },
      this.buildDeviceDocument(device),
    ]);

    try {
      const result = await this.elasticsearchService.bulk({
        operations,
        refresh: false, // Don't wait for refresh, faster for bulk ops
      });

      let errors = 0;
      if (result.errors) {
        result.items.forEach((item: any) => {
          if (item.index?.error) {
            errors++;
            this.logger.error(
              `Failed to bulk index device ${item.index._id}: ${item.index.error.reason}`,
            );
          }
        });
      }

      return { indexed: devices.length - errors, errors };
    } catch (error) {
      this.logger.error(`Bulk indexing failed: ${error.message}`);
      throw error;
    }
  }

  async searchDevicesPaginated(options: {
    page: number;
    limit: number;
    search?: string;
    strict?: boolean;
    categories?: string[];
  }): Promise<{
    data: any[];
    total: number;
    categoryFacets: Record<string, number>;
  }> {
    const { page, limit, search, strict = false, categories = [] } = options;
    const from = (page - 1) * limit;

    const fields = [
      'title^3',
      'brand^2',
      'model^2',
      'category',
      'ean',
      'serial_number',
      'product_code',
      'category_names',
    ];

    const query: any = {
      bool: {
        must: [],
        should: [],
      },
    };

    if (search && search.trim()) {
      if (strict) {
        // Strict mode: match the full phrase exactly on the title field (brand + model)
        query.bool.must.push({
          match_phrase: {
            title: search.trim(),
          },
        });
      } else {
        const keywords = search
          .split(/[\s,]+/)
          .map((w) => w.trim())
          .filter(Boolean);

        keywords.forEach((keyword) => {
          const variants = gtinVariants(keyword);
          // AND logic: every keyword must match at least one field
          query.bool.must.push(
            variants.length > 1
              ? {
                  // A scanned EAN-13 must also find the unit stored under its
                  // GTIN-14 carton code, and the other way round.
                  bool: {
                    should: variants.map((variant) => ({
                      multi_match: { query: variant, fields },
                    })),
                    minimum_should_match: 1,
                  },
                }
              : {
                  multi_match: {
                    query: keyword,
                    fields,
                    fuzziness: 'AUTO',
                  },
                },
          );
          // Scoring bonus: rewards matches in high-value fields without extra filtering
          query.bool.should.push({
            multi_match: {
              query: keyword,
              fields,
              boost: 2,
            },
          });
        });
      }
    } else {
      query.bool.must.push({ match_all: {} });
    }

    try {
      const result = await this.elasticsearchService.search({
        index: 'devices',
        from,
        size: limit,
        query,
        track_total_hits: true,
        ...(categories.length > 0
          ? { post_filter: { terms: { 'category_names.keyword': categories } } }
          : {}),
        aggs: {
          by_category: {
            terms: { field: 'category_names.keyword', size: 200 },
          },
        },
      });

      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value || 0;

      const data = result.hits.hits.map((hit: any) => hit._source);

      const buckets: { key: string; doc_count: number }[] =
        (result.aggregations?.by_category as any)?.buckets ?? [];
      const categoryFacets: Record<string, number> = Object.fromEntries(
        buckets.map((b) => [b.key, b.doc_count]),
      );

      return { data, total, categoryFacets };
    } catch (error) {
      this.logger.error(`Failed to search devices: ${error.message}`);
      throw error;
    }
  }

  async removeDevice(deviceId: string) {
    try {
      await this.elasticsearchService.delete({
        index: 'devices',
        id: deviceId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete device ${deviceId}: ${error.message}`,
      );
    }
  }

  private extractThumbnail(device: any): string {
    if (device.informationalProperties) {
      const imgProp = device.informationalProperties.find((p: any) =>
        [
          'FullImage',
          'HighPic',
          'image',
          'Full Image',
          'Image_ThumbPic',
          'Image_HighPic',
          'Image_LowPic',
          'Image_ThumbPic',
        ].includes(p.property_name),
      );
      return imgProp?.property_value || '';
    }
    return '';
  }
}
