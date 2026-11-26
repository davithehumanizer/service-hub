import { API_URL } from "../utils/globals";
import api from "./api";

/** What the purge of demonstration data removes, or would. */
export type DemoDataReport = {
  accounts: number;
  models: number;
  adoptedModels: number;
  variants: number;
  photos: number;
  touchedModels: number;
  ownerships: number;
  realOwnerships: number;
  journeys: number;
  realJourneys: number;
  records: number;
  realRecords: number;
  subscriptions: number;
  repairers: number;
  /** After a purge: photo files that could not be deleted. */
  filesLeft?: number;
};

/** One contributor's account, and its share of what the purge would remove. */
export type ContributorStats = {
  contributor: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    language?: string | null;
    created_at: string;
  };
  catalogue: Omit<DemoDataReport, "accounts" | "repairers" | "filesLeft">;
  repairers: { repairers: number; pending: number; published: number; rejected: number; revisions: number };
};

const message = (error: any) => {
  const text = error?.response?.data?.message;
  return Array.isArray(text) ? text.join(" · ") : text || "Request failed";
};

export const demoDataService = {
  async preview(): Promise<DemoDataReport> {
    try {
      return (await api.get(`${API_URL}/v1/admin/demo-data`)).data;
    } catch (error: any) {
      throw message(error);
    }
  },
  async contributor(id: number): Promise<ContributorStats> {
    try {
      return (await api.get(`${API_URL}/v1/admin/demo-data/contributors/${id}`)).data;
    } catch (error: any) {
      throw message(error);
    }
  },
  /** Irreversible: the server wants the word typed. */
  async purge(): Promise<DemoDataReport> {
    try {
      return (await api.post(`${API_URL}/v1/admin/demo-data/purge`, { confirm: "PURGE" })).data;
    } catch (error: any) {
      throw message(error);
    }
  },
};
