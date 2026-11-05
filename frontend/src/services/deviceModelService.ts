import { Device } from "../models/device";
import {
  ApiRefusal,
  DeviceModel,
  DeviceModelCreated,
  DeviceModelDetail,
  DeviceModelPage,
  DeviceModelSort,
  DeviceModelVariant,
  VariantInput,
} from "../models/deviceModel";
import { API_URL } from "../utils/globals";
import api from "./api";
import { deviceService } from "./deviceService";
import i18n from "../i18n";

const locale = () => ({ "Accept-Language": i18n.language?.slice(0, 2) || "en" });

/** The API's refusal as it is, a conflict's model included; a refused
 *  body lists its reasons. */
const refusal = (error: any, fallback: string): ApiRefusal => {
  const data = error.response?.data;
  const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
  return typeof message === "string" ? { ...data, message } : { message: fallback };
};

const isCancel = (error: any) =>
  error?.name === "CanceledError" ||
  error?.name === "AbortError" ||
  error?.code === "ERR_CANCELED";

/** Device models, /api/v2/device-models: one result per model, not per entry. */
export const deviceModelService = {
  search: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    /** Canonical names; one parameter each, a name may hold a comma. */
    categories?: string[];
    sortBy?: DeviceModelSort;
    strict?: boolean;
    signal?: AbortSignal;
  }): Promise<DeviceModelPage> => {
    const { signal, ...query } = params;
    try {
      const response = await api.get(`${API_URL}/v2/device-models`, {
        params: query,
        // categories=A&categories=B, not categories[]=A, which the gateway
        // would not read.
        paramsSerializer: { indexes: null },
        headers: locale(),
        signal,
      });
      return response.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
      throw error.response?.data?.message || "Failed to search device models";
    }
  },

  /**
   * A model created by hand, with a first variant when a barcode or a
   * reference is given; an existing one answers instead of a duplicate.
   */
  create: async (model: {
    brand: string;
    name: string;
    categories?: number[];
    ean?: string;
    product_code?: string;
  }): Promise<DeviceModelCreated> => {
    try {
      const response = await api.post(`${API_URL}/v2/device-models`, model, { headers: locale() });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to create the device model";
    }
  },

  /** A variant entered under a model, with its technical properties. */
  addVariant: async (id: number, variant: VariantInput): Promise<DeviceModelVariant> => {
    try {
      const response = await api.post(`${API_URL}/v2/device-models/${id}/variants`, variant);
      return response.data;
    } catch (error: any) {
      throw refusal(error, "Failed to add the variant");
    }
  },

  /** Brand, name or categories, by the model's author or an administrator. */
  update: async (
    id: number,
    changes: { brand?: string; name?: string; categories?: number[] },
  ): Promise<DeviceModel> => {
    try {
      const response = await api.patch(`${API_URL}/v2/device-models/${id}`, changes, { headers: locale() });
      return response.data;
    } catch (error: any) {
      throw refusal(error, "Failed to update the model");
    }
  },

  /** Codes or properties of a variant, by its author or an administrator. */
  updateVariant: async (id: number, variantId: number, changes: VariantInput): Promise<DeviceModelVariant> => {
    try {
      const response = await api.patch(`${API_URL}/v2/device-models/${id}/variants/${variantId}`, changes);
      return response.data;
    } catch (error: any) {
      throw refusal(error, "Failed to update the variant");
    }
  },

  deletePhoto: async (id: number, photoId: string): Promise<void> => {
    try {
      await api.delete(`${API_URL}/v2/device-models/${id}/photos/${photoId}`);
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to delete the photo";
    }
  },

  addPhotos: async (id: number, files: File[]): Promise<void> => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      await api.post(`${API_URL}/v2/device-models/${id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to upload photos";
    }
  },

  /**
   * A model and a page of its variants, searched by their words, narrowed
   * down by their parts, or the one variant asked for.
   */
  get: async (
    id: number,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      parts?: Record<string, string>;
      variant?: number;
    } = {},
  ): Promise<DeviceModelDetail> => {
    const { parts, ...query } = params;
    try {
      const response = await api.get(`${API_URL}/v2/device-models/${id}`, {
        params: {
          ...query,
          parts: parts && Object.entries(parts).map(([key, value]) => `${key}:${value}`),
        },
        // parts=storage:256 GB&parts=colour:Green, which the gateway reads.
        paramsSerializer: { indexes: null },
        headers: locale(),
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to read the device model";
    }
  },

  /**
   * A model as the wizard and the tools carry it: the variant given (a
   * barcode's), read as the model — "Dell Latitude 5590", not the entry's
   * "DELL 5590" or a reseller's name — for the tutorials, the parts and the
   * journey; or else the model alone, with no variant id.
   */
  deviceOf: async (model: DeviceModel, variantId?: number | null): Promise<Device> => {
    if (variantId) {
      const device: Device = await deviceService.getById(String(variantId));
      return { ...device, brand: model.brand, model: model.name, model_id: model.id };
    }
    return deviceModelService.modelAlone(model);
  },

  /** The model alone, as a device with no variant id. */
  modelAlone: (model: DeviceModel): Device => {
    return {
      device_id: "",
      model_id: model.id,
      brand: model.brand,
      model: model.name,
      manufacturer: model.brand,
      categories: model.categories,
      thumbnail: model.thumbnail || undefined,
      ean: "",
      device_type: "",
      technicalProperties: [],
      source: "",
    };
  },
};
