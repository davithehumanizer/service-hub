import api from "./api";
import i18n from "../i18n";

export interface StatsFilter {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface BrandStat {
  brand: string;
  count: number;
}

export interface OutcomeStat {
  repairStatus: string;
  count: number;
}

export interface FailureReasonStat {
  repairBarrier: string;
  count: number;
}

export interface TimeSeriesStat {
  period: string;
  count: number;
}

export interface RepairRecord {
  id: string;
  partnerId?: string;
  brand?: string;
  modelType?: string;
  productCategory?: string;
  productCategoryId?: string;
  yearOfManufacture?: number;
  productAge?: number;
  problem?: string;
  problemTag?: string;
  repairStatus?: string;
  repairBarrier?: string;
  repairSolution?: string;
  solutionTag?: string;
  repairFeasibility?: number;
  repairExplanation?: string;
  groupIdentifier?: string;
  eventDate?: string;
  dataProvider?: string;
  country?: string;
  matchedDeviceId?: number;
  matchedDeviceUrn?: string;
  matchScore?: number;
  matchStatus?: string;
  recordDate?: string;
}

export interface CreateRepairRecordPayload {
  brand?: string;
  modelType?: string;
  productCategory?: string;
  productCategoryId?: string;
  partnerProductCategory?: string;
  yearOfManufacture?: number;
  productAge?: number;
  problem?: string;
  problemTag?: string;
  repairStatus?: string;
  repairBarrier?: string;
  repairSolution?: string;
  solutionTag?: string;
  repairFeasibility?: number;
  repairExplanation?: string;
  groupIdentifier?: string;
  eventDate?: string;
  dataProvider?: string;
  country?: string;
}

export interface RepairCategory {
  id: number;
  slug: string;
  name: string;
  deviceCategoryIds: number[];
}

const BASE = "/v1/repair-monitor";

const buildFilterParams = (filters: StatsFilter): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.append("dateTo", filters.dateTo);
  if (filters.country) params.append("country", filters.country);
  return params;
};

export const repairMonitorService = {
  getRepairCategories: async (): Promise<RepairCategory[]> => {
    const locale = i18n.language?.slice(0, 2) || "en";
    const { data } = await api.get(`${BASE}/categories`, {
      headers: { "Accept-Language": locale },
    });
    return data;
  },

  getStatsByCategory: async (
    filters: StatsFilter = {},
  ): Promise<CategoryStat[]> => {
    const { data } = await api.get(`${BASE}/stats/by-category`, {
      params: buildFilterParams(filters),
    });
    return data;
  },

  getStatsByBrand: async (filters: StatsFilter = {}): Promise<BrandStat[]> => {
    const { data } = await api.get(`${BASE}/stats/by-brand`, {
      params: buildFilterParams(filters),
    });
    return data;
  },

  getStatsByOutcome: async (
    filters: StatsFilter = {},
  ): Promise<OutcomeStat[]> => {
    const { data } = await api.get(`${BASE}/stats/by-outcome`, {
      params: buildFilterParams(filters),
    });
    return data;
  },

  getStatsFailureReasons: async (
    filters: StatsFilter = {},
  ): Promise<FailureReasonStat[]> => {
    const { data } = await api.get(`${BASE}/stats/failure-reasons`, {
      params: buildFilterParams(filters),
    });
    return data;
  },

  getStatsOverTime: async (
    filters: StatsFilter = {},
  ): Promise<TimeSeriesStat[]> => {
    const { data } = await api.get(`${BASE}/stats/over-time`, {
      params: buildFilterParams(filters),
    });
    return data;
  },

  listRecords: async (
    query: Record<string, any> = {},
  ): Promise<{
    data: RepairRecord[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const { data } = await api.get(`${BASE}/records`, { params: query });
    return data;
  },

  createRecord: async (
    payload: CreateRepairRecordPayload,
  ): Promise<RepairRecord> => {
    const { data } = await api.post(`${BASE}/records`, payload);
    return data;
  },

  importCsv: async (
    file: File,
  ): Promise<{ imported: number; skipped: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`${BASE}/records/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  triggerMatching: async (): Promise<{
    processed: number;
    matched: number;
    unmatched: number;
  }> => {
    const { data } = await api.post(`${BASE}/matching/trigger`);
    return data;
  },

  getMatchingStats: async (): Promise<
    { matchStatus: string; count: number }[]
  > => {
    const { data } = await api.get(`${BASE}/matching/stats`);
    return data;
  },

  linkDevice: async (
    recordId: string,
    deviceId: number,
    deviceUrn: string,
  ): Promise<RepairRecord> => {
    const { data } = await api.patch(
      `${BASE}/records/${recordId}/link-device`,
      { deviceId, deviceUrn },
    );
    return data;
  },

  getPlatformSummary: async (): Promise<{
    totalRepairs: number;
    totalDevices: number;
    totalRepairers: number;
  }> => {
    const { data } = await api.get(`${BASE}/stats/summary`);
    return data;
  },
};
