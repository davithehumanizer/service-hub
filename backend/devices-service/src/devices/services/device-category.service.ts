import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceCategory } from '../../entity/device-category.entity';
import { IDeviceCategoryService } from '../interfaces/device-category-service.interface';

@Injectable()
export class DeviceCategoryService implements IDeviceCategoryService {
  constructor(
    @InjectRepository(DeviceCategory)
    private readonly categoryRepository: Repository<DeviceCategory>,
  ) {}

  async findAll(locale?: string): Promise<DeviceCategory[]> {
    if (!locale || locale === 'en') {
      // `canonicalName` is set here too, even though it equals `name`: a field
      // that appears in some locales and not others is a trap for anyone
      // matching on it.
      const categories = await this.categoryRepository.find();
      for (const category of categories) {
        category.canonicalName = category.name;
      }
      return categories;
    }

    // Return categories with translated names via LEFT JOIN, falling back to original
    const rows = await this.categoryRepository
      .createQueryBuilder('c')
      .leftJoin(
        'device_category_translations',
        't',
        't.category_id = c.id AND t.locale = :locale',
        { locale },
      )
      .select('c.id', 'id')
      .addSelect('c.urn', 'urn')
      .addSelect('c.unukey', 'unukey')
      .addSelect('c.is_electrical', 'is_electrical')
      .addSelect('COALESCE(t.translated_name, c.name)', 'name')
      // The untranslated name, so callers keep something stable to match on.
      .addSelect('c.name', 'canonicalName')
      .orderBy('c.id', 'ASC')
      .getRawMany<{
        id: number;
        urn: string;
        unukey: string;
        is_electrical: boolean;
        name: string;
        canonicalName: string;
      }>();

    return rows as unknown as DeviceCategory[];
  }

  async findOne(id: number): Promise<DeviceCategory | null> {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async findByUrn(urn: string): Promise<DeviceCategory | null> {
    return this.categoryRepository.findOne({ where: { urn } });
  }

  async findByUnukey(unukey: string): Promise<DeviceCategory[]> {
    return this.categoryRepository.find({ where: { unukey } });
  }

  async findByName(name: string): Promise<DeviceCategory | null> {
    return this.categoryRepository.findOne({ where: { name } });
  }

  async create(name: string): Promise<DeviceCategory> {
    const category = this.categoryRepository.create({ name });
    const saved = await this.categoryRepository.save(category);

    // Update URN after insert (AfterInsert hook sets it but doesn't persist)
    if (saved.urn) {
      await this.categoryRepository.update(saved.id, { urn: saved.urn });
    }

    return saved;
  }

  async update(
    id: number,
    name: string,
    ifixitWikiid?: string | null,
  ): Promise<DeviceCategory> {
    const category = await this.findOne(id);
    if (!category) throw new Error('Category not found');
    category.name = name;
    if (ifixitWikiid !== undefined) {
      category.ifixit_wikiid = ifixitWikiid;
    }
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
