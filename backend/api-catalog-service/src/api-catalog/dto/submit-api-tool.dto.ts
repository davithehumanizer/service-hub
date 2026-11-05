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
import {
  ApiToolCategory,
  ApiToolAuthType,
  ApiToolPricingModel,
  ApiToolSupportedFormat,
} from '../entities/api-tool.entity';

class EndpointDto {
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  @IsString()
  @MinLength(1)
  path: string;

  @IsString()
  description: string;
}

export class SubmitApiToolDto {
  // Base
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(160)
  shortDescription: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsUrl()
  websiteUrl: string;

  @IsOptional()
  @IsUrl()
  baseApiUrl?: string;

  @IsEnum(ApiToolCategory)
  category: ApiToolCategory;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Access & Auth
  @IsBoolean()
  isPubliclyAccessible: boolean;

  @IsBoolean()
  requiresAccount: boolean;

  @IsBoolean()
  requiresApiKey: boolean;

  @IsEnum(ApiToolAuthType)
  authType: ApiToolAuthType;

  @IsOptional()
  @IsString()
  authDetails?: string;

  // Pricing
  @IsEnum(ApiToolPricingModel)
  pricingModel: ApiToolPricingModel;

  @IsOptional()
  @IsString()
  pricingDetails?: string;

  @IsOptional()
  @IsUrl()
  pricingUrl?: string;

  // Documentation
  @IsOptional()
  @IsUrl()
  documentationUrl?: string;

  @IsOptional()
  @IsUrl()
  swaggerUrl?: string;

  @IsOptional()
  @IsUrl()
  openApiSpecUrl?: string;

  @IsOptional()
  @IsString()
  apiVersion?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ApiToolSupportedFormat, { each: true })
  supportedFormats?: ApiToolSupportedFormat[];

  // Endpoints
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndpointDto)
  endpoints?: EndpointDto[];
}
