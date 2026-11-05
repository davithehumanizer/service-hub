import { Repairer, RepairerFilters } from "../models/repairer";
import { RepairerSearchDto } from "../models/repairer-search.dto";
import { API_URL } from "../utils/globals";
import api from "./api";

/** A repairer reduced to what a map pin needs. */
export interface RepairerMarker {
  id: string;
  lat: number;
  lng: number;
  partner_type: string | null;
}

export const repairerService = {
  list: async (): Promise<Repairer[]> => {
    try {
      const response = await api.get(`${API_URL}/v1/repairers`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to list repairers";
    }
  },
  listPaginated: async (params?: {
    page?: number;
    limit?: number;
    country?: string;
    device_type?: string;
    partner_type?: string;
    search?: string;
    latitude?: number;
    longitude?: number;
    // The visible map rectangle. All four or none — the gateway ignores a
    // partial one rather than filtering on an axis nobody chose.
    north?: number;
    south?: number;
    east?: number;
    west?: number;
  }): Promise<{
    data: Repairer[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    try {
      const response = await api.get(`${API_URL}/v2/repairers`, { params });
      return response.data;
    } catch (error: any) {
      throw (
        error.response?.data?.message || "Failed to list paginated repairers"
      );
    }
  },
  /**
   * Repairers to draw inside the visible map rectangle.
   *
   * Four fields per marker instead of whole entities: listing every repairer
   * costs 25 MB, the same rows as markers cost tens of kilobytes. `total` is
   * the real count inside the bounds even when `markers` has been capped.
   */
  getMarkers: async (params: {
    north: number;
    south: number;
    east: number;
    west: number;
    country?: string;
    device_type?: string;
    partner_type?: string;
    search?: string;
    limit?: number;
  }): Promise<{
    markers: RepairerMarker[];
    total: number;
    truncated: boolean;
  }> => {
    try {
      const response = await api.get(`${API_URL}/v1/repairers/markers`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to load repairer markers";
    }
  },

  getFilters: async (): Promise<RepairerFilters[]> => {
    try {
      const response = await api.get(`${API_URL}/v1/repairers/filters`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to list repairers filters";
    }
  },
  async search(searchDto: RepairerSearchDto): Promise<Repairer[]> {
    try {
      const response = await api.post(`${API_URL}/v1/repairers/search`, {
        searchDto,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching repairers", error);
      throw new Error("Failed to fetch repairers");
    }
  },
  async getRepairer(id: string) {
    try {
      const response = await api.get(`${API_URL}/v1/repairers/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching repairer", error);
      throw new Error("Failed to fetch repairer");
    }
  },
  async findNearestRepairer(
    latitude: number,
    longitude: number,
  ): Promise<{ repairer: Repairer; distance: number } | null> {
    try {
      const response = await api.post(`${API_URL}/v1/repairers/nearest`, {
        latitude,
        longitude,
      });
      return response.data;
    } catch (error) {
      console.error("Error finding nearest repairer", error);
      throw new Error("Failed to find nearest repairer");
    }
  },
  async reportRepairer(
    id: string,
    reason?: string,
  ): Promise<{ id: string; status: string }> {
    try {
      const response = await api.post(`${API_URL}/v1/repairers/${id}/report`, {
        reason,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to report repairer";
    }
  },
  async listReports(status?: string): Promise<any[]> {
    try {
      const response = await api.get(`${API_URL}/v1/repairers/reports/list`, {
        params: status ? { status } : undefined,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to list repairer reports";
    }
  },
  async reviewReport(
    id: string,
    status: "reviewed" | "dismissed",
  ): Promise<any> {
    try {
      const response = await api.post(
        `${API_URL}/v1/repairers/reports/${id}/review`,
        {
          status,
        },
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to review repairer report";
    }
  },
};
