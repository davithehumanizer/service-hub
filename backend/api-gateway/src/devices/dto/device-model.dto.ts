import { ApiProperty } from '@nestjs/swagger';

export class DeviceModelCategoryDto {
  static name = 'DeviceModel.Category';

  @ApiProperty({ example: 173 })
  id: number;

  @ApiProperty({
    description: "The name in the caller's language (Accept-Language)",
    example: 'Smartphone / Pager',
  })
  name: string;

  @ApiProperty({
    description: 'The name to match on, whatever the language',
    example: 'Smart Phone / Pager',
  })
  canonicalName: string;

  @ApiProperty({
    description: 'The iFixit wiki the category maps to, for its tutorials',
    example: 'Android_Phone',
    nullable: true,
  })
  ifixit_wikiid: string | null;

  @ApiProperty({
    description:
      "The category's e-waste family (UNU key), which the wizard's symptoms are keyed on",
    example: '306',
    nullable: true,
  })
  unukey: string | null;
}

export class DeviceModelDto {
  static name = 'DeviceModel.Model';

  @ApiProperty({ example: 877165 })
  id: number;

  @ApiProperty({ example: 'Samsung' })
  brand: string;

  @ApiProperty({ example: 'Galaxy S23' })
  name: string;

  @ApiProperty({
    description: 'Catalogue entries of the model: 0 for one created by hand',
    example: 61,
  })
  variant_count: number;

  @ApiProperty({
    description: 'False when only refurbishers list it',
    example: true,
  })
  has_manufacturer_variant: boolean;

  @ApiProperty({
    description: 'The variant the model is shown with',
    example: 724390,
    nullable: true,
    type: Number,
  })
  representative_device_id: number | null;

  @ApiProperty({ description: "The model's picture, or ''", example: '' })
  thumbnail: string;

  @ApiProperty({ type: [DeviceModelCategoryDto] })
  categories: DeviceModelCategoryDto[];

  @ApiProperty({
    description:
      'The colours its variants come in, as Icecat names them; a comma joins the colours of a two-tone variant',
    example: ['Black', 'Cream colour', 'Green'],
    type: [String],
  })
  colours: string[];

  @ApiProperty({
    description: 'Entered by a contributor: demonstration data',
    example: false,
  })
  is_demo: boolean;
}

export class DeviceModelVariantDto {
  static name = 'DeviceModel.Variant';

  @ApiProperty({ description: 'The catalogue entry', example: 464887 })
  device_id: number;

  @ApiProperty({
    description: 'Who sells it: the maker, or a refurbisher',
    example: 'Lenovo',
  })
  brand: string;

  @ApiProperty({
    description: "The entry's own name, as its source spells it",
    example: 'ThinkCentre neo 50t Gen 4',
  })
  model: string;

  @ApiProperty({ example: '0197528549958' })
  ean: string;

  @ApiProperty({ example: '12JD003BEE' })
  product_code: string;

  @ApiProperty({
    description: 'What tells it from the other variants, when known',
    example: '256 GB, Black',
    nullable: true,
    type: String,
  })
  variant_label: string | null;

  @ApiProperty({
    description:
      'The parts the label is made of, by key: what the facets narrow the variants down by',
    example: { storage: '256 GB', colour: 'Green' },
    nullable: true,
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  variant_parts: Record<string, string> | null;

  @ApiProperty({ example: false })
  is_refurbished: boolean;

  @ApiProperty({
    description: 'Entered by a contributor: demonstration data',
    example: false,
  })
  is_demo: boolean;

  @ApiProperty({
    description:
      "On a model's page: whether the reader may change it, as its author or an administrator",
    required: false,
    example: false,
  })
  editable?: boolean;
}

export class DeviceModelOwnPhotoDto {
  static name = 'DeviceModel.OwnPhoto';

  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ description: 'Uploaded by a contributor', example: false })
  is_demo: boolean;

  @ApiProperty({
    description:
      'Whether the reader may delete it: theirs, or an administrator',
    example: false,
  })
  deletable: boolean;
}

export class DeviceModelPaginationDto {
  static name = 'DeviceModel.Pagination';

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 7 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class GetDeviceModelsResponseDto {
  static name = 'DeviceModel.SearchResponse';

  @ApiProperty({ type: [DeviceModelDto] })
  data: DeviceModelDto[];

  @ApiProperty({ type: DeviceModelPaginationDto })
  pagination: DeviceModelPaginationDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description:
      'Models per canonical category, for the search without its category filter',
    example: { 'Smart Phone / Pager': 7 },
  })
  categoryFacets: Record<string, number>;

  @ApiProperty({
    type: DeviceModelVariantDto,
    required: false,
    description:
      'When the search was a barcode or a reference: the variant it names, its model being the only result',
  })
  variant?: DeviceModelVariantDto;
}

export class DeviceModelVariantsPageDto {
  static name = 'DeviceModel.VariantsPage';

  @ApiProperty({
    type: [DeviceModelVariantDto],
    description: 'The representative first, refurbishers last',
  })
  data: DeviceModelVariantDto[];

  @ApiProperty({ type: DeviceModelPaginationDto })
  pagination: DeviceModelPaginationDto;
}

export class DeviceModelFacetValueDto {
  static name = 'DeviceModel.FacetValue';

  @ApiProperty({ example: '256 GB' })
  value: string;

  @ApiProperty({
    description:
      'Variants with this value among those the other parts asked for leave; 0 when they rule it out',
    example: 33,
  })
  count: number;
}

export class DeviceModelFacetDto {
  static name = 'DeviceModel.Facet';

  @ApiProperty({
    description: 'What the variants differ in',
    enum: [
      'processor',
      'ram',
      'storage',
      'colour',
      'display',
      'graphics',
      'os',
      'keyboard',
      'sim',
    ],
    example: 'storage',
  })
  key: string;

  @ApiProperty({
    type: [DeviceModelFacetValueDto],
    description: 'In order: sizes by size, else alphabetically',
  })
  values: DeviceModelFacetValueDto[];
}

export class DeviceModelWithVariantsDto extends DeviceModelDto {
  static name = 'DeviceModel.WithVariants';

  @ApiProperty({ type: DeviceModelVariantsPageDto })
  variants: DeviceModelVariantsPageDto;

  @ApiProperty({
    type: [DeviceModelFacetDto],
    description:
      'The parts the variants differ in, in the order the label gives them; none for a model of one variant',
  })
  facets: DeviceModelFacetDto[];

  @ApiProperty({
    description:
      'How many variants the parts tell apart: 8 for 61 variants that differ in their reference or seller as well',
    example: 8,
  })
  configurations: number;

  @ApiProperty({
    description:
      'Whether the reader may change it, as its author or an administrator',
    example: false,
  })
  editable: boolean;

  @ApiProperty({
    type: [DeviceModelOwnPhotoDto],
    description: 'The pictures of the model itself, oldest first',
  })
  photos: DeviceModelOwnPhotoDto[];
}

export class DeviceModelLookupDto {
  static name = 'DeviceModel.Lookup';

  @ApiProperty({ type: DeviceModelDto })
  model: DeviceModelDto;

  @ApiProperty({ type: DeviceModelVariantDto })
  variant: DeviceModelVariantDto;
}

export class CreateDeviceModelResponseDto {
  static name = 'DeviceModel.CreateResponse';

  @ApiProperty({
    description:
      'False when the barcode, the reference or the name named an existing model',
    example: true,
  })
  created: boolean;

  @ApiProperty({ type: DeviceModelDto })
  model: DeviceModelDto;

  @ApiProperty({
    type: DeviceModelVariantDto,
    nullable: true,
    description: 'The variant the barcode or the reference made or found',
  })
  variant: DeviceModelVariantDto | null;
}

export class DeviceModelPhotoDto {
  static name = 'DeviceModel.Photo';

  @ApiProperty()
  id: string;

  @ApiProperty()
  modelId: number;

  @ApiProperty()
  url: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  createdAt: Date;
}
