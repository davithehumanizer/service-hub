import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApiToolCategory {
  RECYCLING = 'recycling',
  REPAIR = 'repair',
  DIAGNOSIS = 'diagnosis',
  SPARE_PARTS = 'spare_parts',
  CERTIFICATION = 'certification',
  OTHER = 'other',
}

export enum ApiToolAuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  JWT = 'jwt',
  OTHER = 'other',
}

export enum ApiToolPricingModel {
  FREE = 'free',
  FREEMIUM = 'freemium',
  PAID = 'paid',
  OPEN_SOURCE = 'open_source',
  UNKNOWN = 'unknown',
}

export enum ApiToolSupportedFormat {
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  GRAPHQL = 'graphql',
  RSS = 'rss',
}

class EndpointDto {
  @ApiProperty({ enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] })
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  path: string;

  @ApiProperty()
  @IsString()
  description: string;
}

export class SubmitApiToolDto {
  static name = 'ApiCatalog.Submit';

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(10)
  @MaxLength(160)
  shortDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullDescription?: string;

  @ApiProperty()
  @IsUrl()
  websiteUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  baseApiUrl?: string;

  @ApiProperty({ enum: ApiToolCategory })
  @IsEnum(ApiToolCategory)
  category: ApiToolCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty()
  @IsBoolean()
  isPubliclyAccessible: boolean;

  @ApiProperty()
  @IsBoolean()
  requiresAccount: boolean;

  @ApiProperty()
  @IsBoolean()
  requiresApiKey: boolean;

  @ApiProperty({ enum: ApiToolAuthType })
  @IsEnum(ApiToolAuthType)
  authType: ApiToolAuthType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authDetails?: string;

  @ApiProperty({ enum: ApiToolPricingModel })
  @IsEnum(ApiToolPricingModel)
  pricingModel: ApiToolPricingModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricingDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  pricingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  documentationUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  swaggerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  openApiSpecUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiVersion?: string;

  @ApiPropertyOptional({ enum: ApiToolSupportedFormat, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiToolSupportedFormat, { each: true })
  supportedFormats?: ApiToolSupportedFormat[];

  @ApiPropertyOptional({ type: [EndpointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndpointDto)
  endpoints?: EndpointDto[];
}
