import { API_URL } from "../utils/globals";
import api from "./api";

export interface SparePartModel {
  slug: string;
  name: string;
  brand: {
    slug: string;
    name: string;
    status?: { slug: string; name: string };
  };
  type: {
    slug: string;
    name: string;
    category: { slug: string; name: string };
  };
}

export interface SparePartRepairer {
  id: string;
  name: string;
  address: {
    route: string;
    additional?: string;
    postalCode: string;
    locality: string;
    administrativeAreaLevel1?: string;
    administrativeAreaLevel2?: string;
    latitude: string;
    longitude: string;
  };
  deliveryMethods: string[];
}

export interface SparePartPrice {
  unitAmount: string;
  currency: string;
  productPricingTarget?: { slug: string; name: string };
  taxDefinition?: { countryCode: string; rate: string } | null;
}

export interface MeilisearchHit {
  objectID: string;
  model: SparePartModel;
  serialNumber?: string;
  status?: { slug: string; name: string };
  estimatedDate?: {
    date: string;
    timezone_type: number;
    timezone: string;
  } | null;
  prices: SparePartPrice[];
  repairer: SparePartRepairer;
  _geo?: { lat: string; lng: string };
  /**
   * Stable links to the catalogue's own image route, not presigned URLs: those
   * expire in five minutes and these documents are cached and re-read. Each
   * request redirects to a signature minted for it.
   *
   * mimeType is what keeps a PDF or a 3D model out of an <img>.
   */
  mediaObjects?: Array<{
    url: string;
    mimeType?: string | null;
    originalFilename?: string | null;
  }>;
  [key: string]: any;
}

export interface MeilisearchSearchResult {
  hits: MeilisearchHit[];
  estimatedTotalHits: number;
  offset: number;
  limit: number;
}

const sparePartsService = {
  getById: async (id: string): Promise<MeilisearchHit> => {
    const response = await api.get(
      `${API_URL}/v1/spare-parts/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  list: async (params?: {
    offset?: number;
    limit?: number;
  }): Promise<MeilisearchSearchResult> => {
    const response = await api.get(`${API_URL}/v1/spare-parts`, { params });
    return response.data;
  },

  search: async (params: {
    q?: string;
    brand?: string;
    category?: string;
    offset?: number;
    limit?: number;
  }): Promise<MeilisearchSearchResult> => {
    const response = await api.get(`${API_URL}/v1/spare-parts/search`, {
      params,
    });
    return response.data;
  },

  searchByDevice: async (params: {
    brand: string;
    model: string;
    offset?: number;
    limit?: number;
  }): Promise<MeilisearchSearchResult> => {
    const response = await api.get(`${API_URL}/v1/spare-parts/by-device`, {
      params,
    });
    return response.data;
  },
};

export default sparePartsService;
