import { API_URL } from "../utils/globals";
import api from "./api";
import i18n from "../i18n";
import { DeviceModel, DeviceModelVariant } from "../models/deviceModel";
import { UsageIntensity, VisualCondition } from "../stores/repairWorkflowSlice";

/** One of the signed-in user's own devices: a model, its variant when known. */
export type PersonalDevice = {
  id: string;
  /** Null when its model no longer exists. */
  modelId: number | null;
  deviceId: number | null;
  /** Tells two identical devices apart. */
  nickname: string | null;
  visualCondition: VisualCondition;
  usageIntensity: UsageIntensity;
  acquiredAt: string;
  /** Null if the model no longer exists. */
  model: DeviceModel | null;
  variant: DeviceModelVariant | null;
};

export type PersonalDeviceChanges = {
  deviceId?: number | null;
  nickname?: string | null;
  visualCondition?: VisualCondition;
  usageIntensity?: UsageIntensity;
  /** A date, "2023-06-01". */
  acquiredAt?: string;
};

// The model's categories in the reader's language.
const locale = () => ({ "Accept-Language": i18n.language?.slice(0, 2) || "en" });

const failure = (error: any, fallback: string) =>
  error.response?.data?.message || fallback;

/** The signed-in user's own devices, /api/v2/personal-devices. */
export const personalDeviceService = {
  list: async (): Promise<PersonalDevice[]> => {
    try {
      const response = await api.get(`${API_URL}/v2/personal-devices`, { headers: locale() });
      return response.data;
    } catch (error: any) {
      throw failure(error, "Failed to read your devices");
    }
  },

  /**
   * A device of this model, of this variant when known; a second one of a
   * model already owned only with `another`, else refused.
   */
  add: async (
    device: { modelId: number; deviceId?: number; another?: boolean } & Omit<PersonalDeviceChanges, "deviceId">,
  ): Promise<PersonalDevice> => {
    try {
      const response = await api.post(`${API_URL}/v2/personal-devices`, device, { headers: locale() });
      return response.data;
    } catch (error: any) {
      throw failure(error, "Failed to add the device");
    }
  },

  update: async (id: string, changes: PersonalDeviceChanges): Promise<PersonalDevice> => {
    try {
      const response = await api.patch(`${API_URL}/v2/personal-devices/${id}`, changes, { headers: locale() });
      return response.data;
    } catch (error: any) {
      throw failure(error, "Failed to change the device");
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      await api.delete(`${API_URL}/v2/personal-devices/${id}`);
    } catch (error: any) {
      throw failure(error, "Failed to remove the device");
    }
  },
};
