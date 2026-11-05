import api from "./api";
import { API_URL } from "../utils/globals";

export interface ApiToolEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
}

export interface ApiTool {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription?: string;
  websiteUrl: string;
  baseApiUrl?: string;
  category: string;
  logoUrl?: string;
  tags: string[];
  isPubliclyAccessible: boolean;
  requiresAccount: boolean;
  requiresApiKey: boolean;
  authType: string;
  authDetails?: string;
  pricingModel: string;
  pricingDetails?: string;
  pricingUrl?: string;
  documentationUrl?: string;
  swaggerUrl?: string;
  openApiSpecUrl?: string;
  apiVersion?: string;
  supportedFormats: string[];
  endpoints: ApiToolEndpoint[];
  status: "pending" | "approved" | "rejected";
  isBuiltIn: boolean;
  isCommunity: boolean;
  rejectionReason?: string;
  submitterUserId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitApiToolPayload {
  name: string;
  shortDescription: string;
  fullDescription?: string;
  websiteUrl: string;
  baseApiUrl?: string;
  category: string;
  logoUrl?: string;
  tags?: string[];
  isPubliclyAccessible: boolean;
  requiresAccount: boolean;
  requiresApiKey: boolean;
  authType: string;
  authDetails?: string;
  pricingModel: string;
  pricingDetails?: string;
  pricingUrl?: string;
  documentationUrl?: string;
  swaggerUrl?: string;
  openApiSpecUrl?: string;
  apiVersion?: string;
  supportedFormats?: string[];
  endpoints?: ApiToolEndpoint[];
}

export const apiCatalogService = {
  listApproved: async (): Promise<ApiTool[]> => {
    const response = await api.get(`${API_URL}/v1/api-catalog`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiTool> => {
    const response = await api.get(`${API_URL}/v1/api-catalog/${id}`);
    return response.data;
  },

  submitTool: async (payload: SubmitApiToolPayload): Promise<ApiTool> => {
    const response = await api.post(
      `${API_URL}/v1/api-catalog/submit`,
      payload,
    );
    return response.data;
  },

  listPending: async (): Promise<ApiTool[]> => {
    const response = await api.get(`${API_URL}/v1/api-catalog/admin/pending`);
    return response.data;
  },

  approveTool: async (
    id: string,
    isCommunity: boolean = true,
  ): Promise<ApiTool> => {
    const response = await api.patch(
      `${API_URL}/v1/api-catalog/${id}/approve`,
      {
        isCommunity,
      },
    );
    return response.data;
  },

  rejectTool: async (id: string, reason?: string): Promise<ApiTool> => {
    const response = await api.patch(`${API_URL}/v1/api-catalog/${id}/reject`, {
      reason,
    });
    return response.data;
  },
};
