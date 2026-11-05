import { OwnRepairer } from "../models/repairer";
import { API_URL } from "../utils/globals";
import api from "./api";

export type AuthoredModel = {
  id: number;
  brand: string;
  name: string;
  is_demo: boolean;
  created_at: string | null;
  variant_count: number;
};

export type AuthoredVariant = {
  id: number;
  model_id: number | null;
  brand: string | null;
  model_name: string | null;
  variant_label: string | null;
  ean: string | null;
  is_demo: boolean;
};

export type EntryKind = "models" | "variants" | "repairers";

export type EntriesPage<T> = { items: T[]; total: number };

/** What an account entered: one's own, or a contributor's for an administrator. */
export const contributionsService = {
  async mine<T>(kind: "models" | "variants", offset: number): Promise<EntriesPage<T>> {
    return (await api.get(`${API_URL}/v1/contributions/mine`, { params: { kind, offset } })).data;
  },
  async ofContributor<T = AuthoredModel | AuthoredVariant | OwnRepairer>(
    id: number,
    kind: EntryKind,
    offset: number,
  ): Promise<EntriesPage<T>> {
    return (
      await api.get(`${API_URL}/v1/admin/demo-data/contributors/${id}/entries`, { params: { kind, offset } })
    ).data;
  },
};
