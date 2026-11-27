import { API_URL } from "../utils/globals";
import api from "./api";

/** An account of a company entering demonstration data. */
export interface Contributor {
  id: number;
  email: string;
  created_at: string;
  profile?: { firstName?: string | null; lastName?: string | null };
}

export interface NewContributor {
  email: string;
  firstName?: string;
  lastName?: string;
  /** Language of the invitation email. */
  locale: string;
}

export const contributorService = {
  async list(): Promise<Contributor[]> {
    try {
      const response = await api.get(`${API_URL}/v1/users/contributors`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to list contributors";
    }
  },
  async create(
    contributor: NewContributor,
  ): Promise<Contributor & { invitationSent: boolean }> {
    try {
      const response = await api.post(
        `${API_URL}/v1/users/contributors`,
        contributor,
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to create contributor";
    }
  },
};
