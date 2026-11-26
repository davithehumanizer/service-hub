import { Device, DeviceFilters } from "../models/device";
import {
  IdentificationResponse,
  HandoffSession,
  HandoffStatusResponse,
} from "../models/identification";
import { API_URL } from "../utils/globals";
import api from "./api";
import i18n from "../i18n";

/**
 * The impact of a repair, from The Restart Project's per-category reference
 * data. No water figure: its only input used to be an invented 50 L/kg.
 */
export interface ImpactMetrics {
  /** CO2e avoided, in kg. */
  co2: number;
  equivalents: {
    /** Kilometres of an average combustion car (ADEME, 142 g CO2e/km). */
    carKm: number;
  };
  reference: {
    category: string;
    /** How many real products the category average rests on. */
    products: number;
  };
}

export const deviceService = {
  list: async (): Promise<Device[]> => {
    try {
      const response = await api.get(`${API_URL}/v1/devices`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to list devices";
    }
  },
  getFilters: async (): Promise<DeviceFilters[]> => {
    try {
      const locale = i18n.language?.slice(0, 2) || "en";
      const response = await api.get(`${API_URL}/v1/devices/filters`, {
        headers: { "Accept-Language": locale },
      });
      return response.data;
    } catch (error: any) {
      console.log("Failed to list devices filters");
      //temp send mock data
      return [
        { id: "0", category: "Brand", name: "Samsung" },
        { id: "1", category: "Brand", name: "Apple" },
        { id: "2", category: "Brand", name: "Philips" },
        { id: "3", category: "Model", name: "iPhone 12" },
        { id: "4", category: "Model", name: "Galaxy S21" },
        { id: "5", category: "Model", name: "Galaxy S20" },
        { id: "6", category: "Model", name: "Airpods 3" },
        {
          id: "7",
          category: "DeviceType",
          name: "Smartphone",
        },
        {
          id: "8",
          category: "DeviceType",
          name: "Laptop",
        },
        {
          id: "9",
          category: "DeviceType",
          name: "Tablet",
        },
        {
          id: "10",
          category: "DeviceType",
          name: "Desktop",
        },
        {
          id: "11",
          category: "DeviceType",
          name: "Smartwatch",
        },
        {
          id: "12",
          category: "DeviceType",
          name: "Headphones",
        },
        {
          id: "13",
          category: "DeviceType",
          name: "Earbuds",
        },
        {
          id: "14",
          category: "DeviceType",
          name: "Television",
        },
      ]; // Mock data for testing
      throw error.response?.data?.message || "Failed to list devices filters";
    }
  },
  getById: async (id: string) => {
    try {
      const locale = i18n.language?.slice(0, 2) || "en";
      const response = await api.get(`${API_URL}/v1/devices/${id}`, {
        headers: { "Accept-Language": locale },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching device", error);
      throw error.response?.data?.message || "Failed to list devices";
    }
  },
  /** `name` follows the active locale; `canonicalName` does not — key on it. */
  getCategories: async (): Promise<
    { id: number; name: string; canonicalName?: string; unukey?: string | null }[]
  > => {
    try {
      const locale = i18n.language?.slice(0, 2) || "en";
      const response = await api.get(`${API_URL}/v1/device-categories`, {
        headers: { "Accept-Language": locale },
      });
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch categories", error);
      return [];
    }
  },

  addPhotos: async (deviceId: number, files: File[]): Promise<void> => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      await api.post(`${API_URL}/v1/devices/${deviceId}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to upload photos";
    }
  },

  deletePhoto: async (deviceId: number, photoId: string): Promise<void> => {
    try {
      await api.delete(`${API_URL}/v1/devices/${deviceId}/photos/${photoId}`);
    } catch (error: any) {
      console.error("Error deleting device photo", error);
      throw error.response?.data?.message || "Failed to delete photo";
    }
  },

  identifyByPhoto: async (file: File): Promise<IdentificationResponse> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `${API_URL}/v1/identification/analyze`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error identifying device by photo", error);
      throw error.response?.data?.message || "Failed to identify device";
    }
  },

  createPhotoHandoffSession: async (): Promise<HandoffSession> => {
    try {
      const response = await api.post(
        `${API_URL}/v1/identification/handoff`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating photo handoff session", error);
      throw (
        error.response?.data?.message || "Failed to create handoff session"
      );
    }
  },

  getPhotoHandoffStatus: async (
    pairingId: string,
    token: string,
  ): Promise<HandoffStatusResponse> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/identification/handoff/${pairingId}/status`,
        { headers: { "x-handoff-token": token } },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error polling photo handoff status", error);
      throw (
        error.response?.data?.message || "Failed to check handoff status"
      );
    }
  },

  submitBarcodeHandoff: async (
    pairingId: string,
    token: string,
    code: string,
  ): Promise<void> => {
    try {
      await api.post(
        `${API_URL}/v1/identification/handoff/${pairingId}/barcode`,
        { code },
        { headers: { "x-handoff-token": token } },
      );
    } catch (error: any) {
      console.error("Error submitting handoff barcode", error);
      throw error.response?.data?.message || "Failed to submit barcode";
    }
  },

  submitPhotoHandoff: async (
    pairingId: string,
    token: string,
    file: File,
  ): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(
        `${API_URL}/v1/identification/handoff/${pairingId}/photo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-handoff-token": token,
          },
        },
      );
    } catch (error: any) {
      console.error("Error submitting handoff photo", error);
      throw error.response?.data?.message || "Failed to submit photo";
    }
  },

  searchIfixit: async (
    query: string,
    type: string,
    subject: string,
    difficulty: string,
    brand?: string,
    category?: string,
    categoryWikiId?: string,
  ): Promise<any> => {
    try {
      // iFixit's own translations of titles, subjects and links (PBI 13847).
      const lang = i18n.language?.slice(0, 2) || "en";
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/search`,
        {
          params: {
            query,
            type,
            subject,
            difficulty,
            brand,
            category,
            categoryWikiId,
            lang: ["en", "fr", "de", "nl"].includes(lang) ? lang : "en",
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error searching iFixit devices", error);
      throw error.response?.data?.message || "Failed to search iFixit devices";
    }
  },

  suggestIfixit: async (query: string, signal?: AbortSignal): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/suggest`,
        {
          params: { query },
          signal,
        },
      );
      return response.data;
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        throw error;
      }
      console.error("Error fetching iFixit suggestions", error);
      throw (
        error.response?.data?.message || "Failed to fetch iFixit suggestions"
      );
    }
  },

  searchYoutubeVideos: async (query: string): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/youtube/search`,
        {
          params: { query },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error searching YouTube videos", error);
      throw error.response?.data?.message || "Failed to search YouTube videos";
    }
  },

  getAllIfixitDevices: async (page: number, limit: number): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/devices`,
        {
          params: { page, limit },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error getting all iFixit devices", error);
      throw error.response?.data?.message || "Failed to get all iFixit devices";
    }
  },

  getIfixitDeviceById: async (id: string): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/devices/${id}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error getting iFixit device by id", error);
      throw (
        error.response?.data?.message || "Failed to get iFixit device by id"
      );
    }
  },

  getIfixitDeviceParts: async (id: string): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/devices/${id}/parts`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error getting iFixit device parts", error);
      throw (
        error.response?.data?.message || "Failed to get iFixit device parts"
      );
    }
  },

  getIfixitDeviceGuide: async (id: string, guideid: string): Promise<any> => {
    try {
      const response = await api.get(
        `${API_URL}/v1/external-adapters/ifixit/devices/${id}/guide/${guideid}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Error getting iFixit device guide", error);
      throw (
        error.response?.data?.message || "Failed to get iFixit device guide"
      );
    }
  },

  /**
   * The CO2e a repair on this category of device avoids.
   *
   * Returns null when the reference data has no factor for the category —
   * large appliances and musical instruments, mainly. Callers must show
   * nothing rather than a zero.
   *
   * This used to swallow every failure and return `co2: 100` and friends,
   * hardcoded, which the interface then presented as a measurement.
   */
  fetchFixometerImpactMetrics: async (
    deviceType: string,
  ): Promise<ImpactMetrics | null> => {
    const response = await api.get(
      `${API_URL}/v1/external-adapters/fixometer/impact-metrics`,
      { params: { deviceType } },
    );
    return response.data?.data ?? null;
  },
};
