/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as fastCsv from 'fast-csv';
import { Repairer } from '../repairer.entity';
import { RepairerDevice } from '../repairer-device.entity';
import * as wkx from 'wkx';
import { firstLetterUpper } from 'src/utils/utils';

@Injectable()
export class RepairerImporterService {
  constructor(
    @InjectRepository(Repairer)
    private readonly repairerRepository: Repository<Repairer>,
    @InjectRepository(RepairerDevice)
    private readonly repairerDeviceRepository: Repository<RepairerDevice>,
  ) {}

  async importCsv(): Promise<void> {
    const filePath = path.join(__dirname, '../../data/repairers_demo.csv');

    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier non trouvé : ${filePath}`);
    }

    function extractCoordinates(
      wkbHex: string,
    ): { latitude: number; longitude: number } | null {
      try {
        const buffer = Buffer.from(wkbHex, 'hex');
        const geometry = wkx.Geometry.parse(buffer);

        if (geometry instanceof wkx.Point) {
          return { latitude: geometry.x, longitude: geometry.y };
        }
      } catch (error) {
        console.error('Erreur lors de la conversion du WKB:', error);
      }
      return null;
    }

    function parseJsonField<T>(field: string | null, defaultValue: T): T {
      try {
        return field ? JSON.parse(field) : defaultValue;
      } catch {
        return defaultValue;
      }
    }

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(fastCsv.parse({ headers: true, delimiter: ',' }))
        .on('data', async (row) => {
          console.log('Importing:', row.id);
          const existingRepairer = await this.repairerRepository.findOne({
            where: { repairer_import_id: row.id },
          });

          const coord = extractCoordinates(row.geom);
          const latitude = coord?.latitude ?? 0;
          const longitude = coord?.longitude ?? 0;

          let repairer = existingRepairer ?? new Repairer();
          repairer.repairer_import_id = row.id;
          repairer.name = row.name;
          repairer.description = row.description || '';
          repairer.address = row.address_formatted;
          repairer.country = row.address_country_code;
          repairer.postal_code = row.address_postal_code;
          repairer.city = row.address_city;
          repairer.latitude = latitude;
          repairer.longitude = longitude;
          repairer.source = 'CSV';

          const emails = parseJsonField<{ value: string }[]>(
            row.contacts_email,
            [],
          );
          const phones = parseJsonField<{ value: string }[]>(
            row.contacts_phone,
            [],
          );
          repairer.email = emails.length > 0 ? emails[0].value : '';
          repairer.phone = phones.length > 0 ? phones[0].value : '';

          const websites = parseJsonField<{ value: string }[]>(
            row.contacts_website,
            [],
          );
          repairer.website = websites.length > 0 ? websites[0].value : '';

          repairer = await this.repairerRepository.save(repairer);

          if (row.device_types) {
            //Handle firstLetterUpper
            row.device_types = firstLetterUpper(row.device_types);

            //Handle plurals ?
            if (row.device_types.endsWith('s')) {
              row.device_types = row.device_types.slice(0, -1);
            }

            const deviceTypes = parseJsonField<{ code: string }[]>(
              row.device_types,
              [],
            ).map((dt) => dt.code);

            await this.repairerDeviceRepository.delete({ repairer: repairer });

            const repairerDevices = deviceTypes.map((type) => {
              const repairerDevice = new RepairerDevice();
              repairerDevice.repairer = repairer;
              repairerDevice.device_type = type;
              return repairerDevice;
            });

            await this.repairerDeviceRepository.save(repairerDevices);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => reject(error));
    });
  }
}
