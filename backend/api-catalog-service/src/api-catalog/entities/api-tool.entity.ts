import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ApiToolCategory {
  RECYCLING = "recycling",
  REPAIR = "repair",
  DIAGNOSIS = "diagnosis",
  SPARE_PARTS = "spare_parts",
  CERTIFICATION = "certification",
  OTHER = "other",
}

export enum ApiToolAuthType {
  NONE = "none",
  API_KEY = "api_key",
  OAUTH2 = "oauth2",
  BASIC_AUTH = "basic_auth",
  JWT = "jwt",
  OTHER = "other",
}

export enum ApiToolPricingModel {
  FREE = "free",
  FREEMIUM = "freemium",
  PAID = "paid",
  OPEN_SOURCE = "open_source",
  UNKNOWN = "unknown",
}

export enum ApiToolStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ApiToolSupportedFormat {
  JSON = "json",
  XML = "xml",
  CSV = "csv",
  GRAPHQL = "graphql",
  RSS = "rss",
}

@Entity("api_tools")
export class ApiTool {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // --- Base ---
  @Column()
  name: string;

  @Column({ length: 160 })
  shortDescription: string;

  @Column({ type: "text", nullable: true })
  fullDescription: string;

  @Column()
  websiteUrl: string;

  @Column({ nullable: true })
  baseApiUrl: string;

  @Column({
    type: "enum",
    enum: ApiToolCategory,
    default: ApiToolCategory.OTHER,
  })
  category: ApiToolCategory;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: "jsonb", default: [] })
  tags: string[];

  // --- Access & Auth ---
  @Column({ default: false })
  isPubliclyAccessible: boolean;

  @Column({ default: false })
  requiresAccount: boolean;

  @Column({ default: false })
  requiresApiKey: boolean;

  @Column({
    type: "enum",
    enum: ApiToolAuthType,
    default: ApiToolAuthType.NONE,
  })
  authType: ApiToolAuthType;

  @Column({ type: "text", nullable: true })
  authDetails: string;

  // --- Pricing ---
  @Column({
    type: "enum",
    enum: ApiToolPricingModel,
    default: ApiToolPricingModel.UNKNOWN,
  })
  pricingModel: ApiToolPricingModel;

  @Column({ type: "text", nullable: true })
  pricingDetails: string;

  @Column({ nullable: true })
  pricingUrl: string;

  // --- Documentation ---
  @Column({ nullable: true })
  documentationUrl: string;

  @Column({ nullable: true })
  swaggerUrl: string;

  @Column({ nullable: true })
  openApiSpecUrl: string;

  @Column({ nullable: true })
  apiVersion: string;

  @Column({ type: "jsonb", default: [] })
  supportedFormats: ApiToolSupportedFormat[];

  // --- Endpoints ---
  @Column({ type: "jsonb", default: [] })
  endpoints: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    description: string;
  }[];

  // --- Moderation ---
  @Column({ type: "enum", enum: ApiToolStatus, default: ApiToolStatus.PENDING })
  status: ApiToolStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  submitterUserId: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: "timestamptz", nullable: true })
  approvedAt: Date;

  @Column({ default: false })
  isBuiltIn: boolean;

  @Column({ default: false })
  isCommunity: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
