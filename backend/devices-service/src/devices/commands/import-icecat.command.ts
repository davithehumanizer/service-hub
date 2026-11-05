import { Command, Option, Positional } from 'nestjs-command';
import { Injectable, Inject } from '@nestjs/common';
import { DevicesService } from '../services/devices.service';
import { DeviceCategoryService } from '../services/device-category.service';
import {
  readCsvStream,
  loadFeaturesFromJson,
  fetchIcecatJson,
  extractFeaturesFromIcecat,
} from '../utils/icecat.utils';
import { ImportLogger } from '../utils/logger.utils';
import { icecatNamingProperties } from '../../device-models/icecat-naming';
import * as path from 'path';
import * as fs from 'fs';

interface IcecatImportOptions {
  csv: string;
  featuresJson?: string;
  mapping?: string;
  selectedIds?: string;
  concurrency?: string;
  noUpdate?: boolean;
  skip?: string;
  startId?: string;
  outDir?: string;
  logDir?: string;
}

@Injectable()
export class ImportIcecatCommand {
  constructor(
    @Inject('IDevicesService')
    private readonly devicesService: DevicesService,
    @Inject('IDeviceCategoryService')
    private readonly categoryService: DeviceCategoryService,
  ) {}

  @Command({
    command: 'import:icecat',
    describe: 'Import devices from Icecat CSV',
  })
  async run(
    @Option({
      name: 'csv',
      describe: 'Path to CSV file',
      type: 'string',
      demandOption: true,
    })
    csv: string,
    @Option({
      name: 'featuresJson',
      describe: 'Path to features JSON file',
      type: 'string',
    })
    featuresJson: string,
    @Option({
      name: 'mapping',
      describe: 'Path to category mapping JSON file',
      type: 'string',
    })
    mapping: string,
    @Option({
      name: 'selectedIds',
      describe: 'Path to selected IDs JSON file',
      type: 'string',
    })
    selectedIds: string,
    @Option({
      name: 'concurrency',
      describe: 'Number of concurrent requests',
      type: 'string',
      default: '10',
    })
    concurrency: string,
    @Option({
      name: 'noUpdate',
      describe: 'Skip update if device exists',
      type: 'boolean',
      default: false,
    })
    noUpdate: boolean,
    @Option({
      name: 'skip',
      describe: 'Skip N lines',
      type: 'string',
      default: '0',
    })
    skip: string,
    @Option({
      name: 'startId',
      describe: 'Start from specific product ID',
      type: 'string',
    })
    startId: string,
    @Option({
      name: 'outDir',
      describe: 'Output directory for files mode (optional)',
      type: 'string',
    })
    outDir: string,
    @Option({
      name: 'logDir',
      describe: 'Directory for log files',
      type: 'string',
    })
    logDir: string,
  ) {
    const options: IcecatImportOptions = {
      csv,
      featuresJson,
      mapping,
      selectedIds,
      concurrency,
      noUpdate,
      skip,
      startId,
      outDir,
      logDir,
    };

    const importId = `icecat-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const importDate = new Date().toISOString();
    const logger = new ImportLogger(options.logDir);

    logger.log(
      'INFO',
      `Starting import batch: ${importId}`,
      `Date: ${importDate}`,
    );
    logger.log(
      'INFO',
      `Concurrency: ${options.concurrency}`,
      `CSV: ${options.csv}`,
    );

    // Setup graceful shutdown
    let isShuttingDown = false;
    process.on('SIGINT', () => {
      if (isShuttingDown) {
        console.log('\nForce quit detected. Exiting immediately.');
        process.exit(1);
      }
      isShuttingDown = true;
      console.log(
        '\n\nInterrupt signal received (Ctrl+C). Finishing current product and generating summary...',
      );
      logger.log('WARN', 'Import interrupted by user (Ctrl+C)');
    });

    // Load mappings
    let categoryMapping: any = null;
    if (options.mapping && fs.existsSync(options.mapping)) {
      try {
        categoryMapping = JSON.parse(fs.readFileSync(options.mapping, 'utf8'));
        console.log(`Loaded category mapping from ${options.mapping}`);
      } catch (e) {
        console.warn(
          `Failed to parse mapping file ${options.mapping}: ${
            (e as Error).message
          }`,
        );
      }
    }

    // Load selected IDs
    let selectedIdsSet: Set<string> | null = null;
    if (options.selectedIds && fs.existsSync(options.selectedIds)) {
      try {
        const raw = fs.readFileSync(options.selectedIds, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          selectedIdsSet = new Set(arr.map((v) => String(v).trim()));
          console.log(
            `Loaded ${selectedIdsSet.size} selected category ids from ${options.selectedIds}`,
          );
        }
      } catch (e) {
        console.warn(
          `Failed to parse selected ids file ${options.selectedIds}: ${
            (e as Error).message
          }`,
        );
      }
    }

    // Load features
    let signMap: Record<string, string> = {};
    let nameMap: Record<string, string> = {};
    if (options.featuresJson) {
      const result = loadFeaturesFromJson(options.featuresJson);
      signMap = result.signMap;
      nameMap = result.nameMap;
    }

    // CSV Stream
    const skipLines = parseInt(options.skip || '0', 10);
    const startIdVal = options.startId || null;
    const idsIterator = readCsvStream(
      options.csv,
      selectedIdsSet,
      skipLines,
      startIdVal,
    );

    const concurrencyLimit = parseInt(options.concurrency || '10', 10);
    let activePromises = 0;
    let i = 0;
    const promises: Promise<void>[] = [];

    // Helper to resolve category
    const ensureCategory = async (
      categoryObj: any,
    ): Promise<{ id: number; name: string } | null> => {
      if (!categoryObj) return null;
      const catName =
        (categoryObj.Name && (categoryObj.Name.Value || categoryObj.Name)) ||
        categoryObj.Value ||
        String(categoryObj);
      const icecatId = categoryObj.CategoryID;

      // Check mapping
      if (categoryMapping && icecatId && categoryMapping[icecatId]) {
        const mapped = categoryMapping[icecatId];
        return { id: mapped.backendId, name: mapped.backendName };
      }

      if (!catName) return null;

      // Find by name
      const categories = await this.categoryService.findAll();
      const found = categories.find(
        (c) =>
          String(c.name || '').toLowerCase() === String(catName).toLowerCase(),
      );
      if (found) return { id: found.id, name: found.name };

      // Create
      try {
        const created = await this.categoryService.create(catName);
        return { id: created.id, name: created.name };
      } catch (e) {
        console.error('ensureCategory error:', e);
        return null;
      }
    };

    // Process function
    const processProduct = async (id: string, index: number) => {
      if (isShuttingDown) return;

      // console.log(`Processing #${index}: ${id}`);

      // Check existence if noUpdate (optimized - no relations loaded)
      if (options.noUpdate) {
        try {
          const existing = await this.devicesService.existsBySourceId(id);
          if (existing) {
            logger.logSuccess(
              String(existing.device_id),
              'N/A',
              'SKIPPED (ALREADY EXISTS - NO UPDATE)',
            );
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      try {
        const j = await fetchIcecatJson(id);
        logger.incrementIcecatApiCalls();

        const g = j.data?.GeneralInfo || j.GeneralInfo || {};
        const eans = g?.GTIN || g?.GTINs || [];
        const ean = Array.isArray(eans) && eans.length ? String(eans[0]) : '';
        const serial = g.BrandPartCode || String(id);
        const manufacturer = g.Brand || g.BrandInfo?.BrandName || '';
        const brand = g.Brand || '';
        const model =
          g.ProductName ||
          g.ProductSeries?.Value ||
          g.ProductFamily?.Value ||
          '';

        const icecatFeatures = extractFeaturesFromIcecat(j);

        // Resolve categories
        let categoryIds: { id: number; name: string }[] = [];
        try {
          const catObj =
            j.data?.GeneralInfo?.Category || j.Category || g.Category || null;

          let mappedCategory: { id: number; name: string } | null = null;
          if (
            categoryMapping &&
            catObj &&
            catObj.CategoryID &&
            categoryMapping[catObj.CategoryID]
          ) {
            const m = categoryMapping[catObj.CategoryID];
            mappedCategory = { id: m.backendId, name: m.backendName };
          }

          if (mappedCategory) {
            categoryIds = [mappedCategory];
          } else {
            const cat = await ensureCategory(catObj);
            if (cat) categoryIds = [cat];
          }
        } catch (e) {
          console.error('Category resolution failed for', id, e);
        }

        // Technical properties
        const technicalProperties = icecatFeatures
          .map((f) => {
            const jsonFeatureName = f.name;
            const featureNameFromXml = f.featureId && nameMap[f.featureId];
            const signTextFromXml = f.sign && signMap[f.sign];
            const propName =
              jsonFeatureName ||
              featureNameFromXml ||
              signTextFromXml ||
              f.signText ||
              f.sign ||
              'unknown';
            return { property_name: propName, property_value: f.value || '' };
          })
          .filter((p) => p.property_name && p.property_value !== undefined);

        if (
          j?.data?.GeneralInfo?.BrandPartCode &&
          typeof j.data.GeneralInfo.BrandPartCode === 'string' &&
          j.data.GeneralInfo.BrandPartCode.length > 0
        ) {
          technicalProperties.push({
            property_name: 'BrandPartCode',
            property_value: j.data.GeneralInfo.BrandPartCode,
          });
        }

        if (
          j?.data?.GeneralInfo?.GTIN &&
          Array.isArray(j.data.GeneralInfo.GTIN) &&
          j.data.GeneralInfo.GTIN.length > 0
        ) {
          technicalProperties.push({
            property_name: 'GTIN',
            property_value: j.data.GeneralInfo.GTIN.join(','),
          });
        } else if (
          j?.data?.GeneralInfo?.GTIN &&
          typeof j.data.GeneralInfo.GTIN === 'string' &&
          j.data.GeneralInfo.GTIN.length > 0
        ) {
          technicalProperties.push({
            property_name: 'GTIN',
            property_value: j.data.GeneralInfo.GTIN,
          });
        }

        // Additional properties
        const additionalProperties: {
          property_name: string;
          property_value: string;
        }[] = [];

        // Add ReleaseDate and EndOfLifeDate
        if (
          j?.data?.GeneralInfo?.ReleaseDate &&
          typeof j.data.GeneralInfo.ReleaseDate === 'string' &&
          j.data.GeneralInfo.ReleaseDate.length > 0
        ) {
          additionalProperties.push({
            property_name: 'ReleaseDate',
            property_value: j.data.GeneralInfo.ReleaseDate,
          });
        }
        if (
          j?.data?.GeneralInfo?.EndOfLifeDate &&
          typeof j.data.GeneralInfo.EndOfLifeDate === 'string' &&
          j.data.GeneralInfo.EndOfLifeDate.length > 0
        ) {
          additionalProperties.push({
            property_name: 'EndOfLifeDate',
            property_value: j.data.GeneralInfo.EndOfLifeDate,
          });
        }

        // Add Description metadata
        if (
          j?.data?.GeneralInfo?.Description?.LongDesc &&
          typeof j.data.GeneralInfo.Description.LongDesc === 'string' &&
          j.data.GeneralInfo.Description.LongDesc.length > 0
        ) {
          additionalProperties.push({
            property_name: 'LongDesc',
            property_value: j.data.GeneralInfo.Description.LongDesc,
          });
        }
        if (
          j?.data?.GeneralInfo?.Description?.Updated &&
          typeof j.data.GeneralInfo.Description.Updated === 'string' &&
          j.data.GeneralInfo.Description.Updated.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Updated',
            property_value: j.data.GeneralInfo.Description.Updated,
          });
        }
        if (
          j?.data?.GeneralInfo?.Description?.URL &&
          typeof j.data.GeneralInfo.Description.URL === 'string' &&
          j.data.GeneralInfo.Description.URL.length > 0
        ) {
          additionalProperties.push({
            property_name: 'URL',
            property_value: j.data.GeneralInfo.Description.URL,
          });
        }

        // Add Image URLs
        if (
          j?.data?.Image?.HighPic &&
          typeof j.data.Image.HighPic === 'string' &&
          j.data.Image.HighPic.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Image_HighPic',
            property_value: j.data.Image.HighPic,
          });
        }
        if (
          j?.data?.Image?.LowPic &&
          typeof j.data.Image.LowPic === 'string' &&
          j.data.Image.LowPic.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Image_LowPic',
            property_value: j.data.Image.LowPic,
          });
        }
        if (
          j?.data?.Image?.Pic500x500 &&
          typeof j.data.Image.Pic500x500 === 'string' &&
          j.data.Image.Pic500x500.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Image_Pic500x500',
            property_value: j.data.Image.Pic500x500,
          });
        }
        if (
          j?.data?.Image?.ThumbPic &&
          typeof j.data.Image.ThumbPic === 'string' &&
          j.data.Image.ThumbPic.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Image_ThumbPic',
            property_value: j.data.Image.ThumbPic,
          });
        }

        // Add Multimedia as JSON string
        if (
          j?.data?.Multimedia &&
          Array.isArray(j.data.Multimedia) &&
          j.data.Multimedia.length > 0
        ) {
          additionalProperties.push({
            property_name: 'Multimedia',
            property_value: JSON.stringify(j.data.Multimedia),
          });
        }

        additionalProperties.push(...icecatNamingProperties(g));

        const informationalProperties = [...additionalProperties];

        const payload = {
          ean: ean || '',
          serial_number: '',
          product_code: serial || '',
          manufacturer: manufacturer || '',
          brand: brand || '',
          model: model || '',
          categories: categoryIds.map((c) => c.id),
          device_type: '',
          source: 'ICECAT',
          import_id: importId,
          import_date: importDate,
          source_id: String(id),
          technicalProperties: technicalProperties,
          informationalProperties: informationalProperties,
        };

        // Create or Update (optimized existence check)
        if (options.noUpdate) {
          const created = await this.devicesService.createDevice(
            payload as any,
          );
          logger.logSuccess(String(created.device_id), payload.ean, 'CREATED');
        } else {
          const existingCheck = await this.devicesService.existsBySourceId(
            String(id),
          );
          if (existingCheck) {
            // Update
            await this.devicesService.updateDevice(
              existingCheck.device_id,
              payload as any,
            );
            logger.logSuccess(
              String(existingCheck.device_id),
              payload.ean,
              'UPDATED',
            );
          } else {
            // Create
            const created = await this.devicesService.createDevice(
              payload as any,
            );
            logger.logSuccess(
              String(created.device_id),
              payload.ean,
              'CREATED',
            );
          }
        }
      } catch (e) {
        const err = e;
        if (err.code === 'BRAND_RESTRICTED') {
          logger.incrementBrandRestricted();
          logger.log(
            'WARN',
            `Skipping product ${id}`,
            `Reason: ${err.message}`,
          );
        } else {
          logger.logError(id, '', err);
        }
      }
    };

    // Main loop
    for await (const id of idsIterator) {
      i += 1;
      if (isShuttingDown) {
        logger.log('INFO', 'Stopping import due to user interrupt');
        break;
      }

      while (activePromises >= concurrencyLimit) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      activePromises++;
      const p = processProduct(id, i).finally(() => {
        activePromises--;
      });
      promises.push(p);

      // Periodic GC
      if (i % 50 === 0 && (global as any).gc) {
        (global as any).gc();
      }
    }

    // Wait for remaining
    if (activePromises > 0) {
      console.log(`Waiting for ${activePromises} active requests to finish...`);
      while (activePromises > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logger.logSummary(isShuttingDown);
  }
}
