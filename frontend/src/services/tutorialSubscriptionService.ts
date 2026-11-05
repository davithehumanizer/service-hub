import { API_URL } from "../utils/globals";
import api from "./api";

export interface CreateTutorialSubscriptionDto {
  email: string;
  deviceId?: string;
  modelId?: number;
  issueTypes: string[];
  locale: string;
}

export const tutorialSubscriptionService = {
  subscribe: async (
    dto: CreateTutorialSubscriptionDto,
  ): Promise<{ success: boolean }> => {
    try {
      const response = await api.post(
        `${API_URL}/v1/notifications/tutorial-subscriptions`,
        dto,
      );
      return response.data;
    } catch (error: any) {
      throw (
        error.response?.data?.message ||
        "Failed to subscribe to tutorial notifications"
      );
    }
  },
};
