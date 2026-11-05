import api from "./api";
import { API_URL } from "../utils/globals";

export interface CreateRepairJourneyDto {
  /** The variant, when one is known. */
  deviceId?: number;
  modelId?: number;
  brand?: string;
  modelType?: string;
  productCategory?: string;
  productCategoryId?: string;
  problem?: string;
  /** Symptom keys ticked in the wizard, never their translated labels. */
  issues?: string[];
  problemTag?: string;
  repairRoute?: "DoItYourself" | "Professional" | "Recycle" | "Reuse";
  issueSeverity?: string;
  issueDuration?: string;
  visualCondition?: string;
  usageIntensity?: string;
  estimatedAge?: number;
  locale?: string;
  country?: string;
}

export interface RepairJourneyCreated {
  id: string;
  declarationToken: string;
  tokenExpiresAt: string;
}

export type JourneyOutcome = "Fixed" | "PartiallyFixed" | "EndOfLife";

/** A device given away or sold was not repaired: there is no outcome to ask for. */
export const asksForOutcome = (route?: string | null) => route !== "Reuse";

/** A journey as its owner sees it. The declaration token is never returned. */
export interface JourneySummary {
  id: string;
  /** The catalogue device, when one was picked. Null for a journey described
   *  by category alone. */
  deviceId: number | null;
  /** Its model, when one was picked. */
  modelId: number | null;
  /** The personal device whose repair history it belongs to. */
  ownershipId: string | null;
  brand?: string;
  modelType?: string;
  productCategory?: string;
  problemTag?: string;
  repairRoute?: string;
  issues: string[];
  journeyDate: string;
  status: "Pending" | "Declared";
  declaredAt: string | null;
  outcome: string | null;
  solutionTag: string | null;
  repairBarrier: string | null;
  eventDate: string | null;
  /**
   * CO2e avoided, in kg, frozen when the outcome was declared. Null means
   * unknown — the reference data covers no large appliances or musical
   * instruments — and must never be counted as zero.
   */
  co2Avoided: number | null;
  co2ReferenceCategory: string | null;
  co2ReferenceProducts: number | null;
}

export interface DeclareOutcomeDto {
  /** Omitted when the signed-in owner answers from another device. */
  declarationToken?: string;
  outcome: JourneyOutcome;
  /** Only when it failed. */
  repairBarrier?: string;
  /** Only when it worked. */
  solutionTag?: string;
  repairSolution?: string;
  yearOfManufacture?: number;
}

export const REPAIR_BARRIERS = [
  "TooExpensive",
  "SparePartsUnavailable",
  "NoSkillsInfo",
  "ProductDesign",
  "NoFaultFound",
  "BeyondEconomicRepair",
  "Other",
] as const;

export const SOLUTION_TAGS = [
  "PartReplacement",
  "Cleaning",
  "Soldering",
  "SoftwareUpdate",
  "Rewiring",
  "Adjustment",
  "Sewing",
  "Lubrication",
  "Other",
] as const;

/**
 * The server rejects more than this per request. A browser used for years would
 * eventually hold more, so the most recent ones are what gets sent.
 */
const MAX_TOKENS_PER_REQUEST = 50;

const recentTokens = (tokens: string[]) =>
  tokens.slice(-MAX_TOKENS_PER_REQUEST);

export const repairJourneyService = {
  /**
   * Records a finished wizard journey. Works for guests — the returned token is
   * what lets the outcome be declared later, and it is never returned again, so
   * the caller must persist it.
   */
  create: async (
    dto: CreateRepairJourneyDto,
  ): Promise<RepairJourneyCreated> => {
    const response = await api.post<RepairJourneyCreated>(
      `${API_URL}/v1/repair-monitor/journeys`,
      dto,
    );
    return response.data;
  },

  /**
   * Promotes a journey into a repair record. This is the only call that puts
   * platform data into the statistics.
   */
  declareOutcome: async (
    journeyId: string,
    dto: DeclareOutcomeDto,
  ): Promise<{ journeyId: string; repairRecordId: string }> => {
    const response = await api.patch(
      `${API_URL}/v1/repair-monitor/journeys/${journeyId}/outcome`,
      dto,
    );
    return response.data;
  },

  /**
   * Lists the journeys the caller may see: those this browser holds a token
   * for, plus those already attached to the signed-in account.
   *
   * A POST for a read, because the tokens are secrets and a query string ends
   * up in logs and browser history.
   */
  list: async (tokens: string[]): Promise<JourneySummary[]> => {
    const response = await api.post<JourneySummary[]>(
      `${API_URL}/v1/repair-monitor/journeys/lookup`,
      { tokens: recentTokens(tokens) },
    );
    return response.data;
  },

  /**
   * Puts a journey in the repair history of one of the signed-in user's
   * devices, which takes the state the journey recorded.
   */
  linkPersonalDevice: async (journeyId: string, ownershipId: string): Promise<void> => {
    await api.patch(
      `${API_URL}/v1/repair-monitor/journeys/${journeyId}/personal-device`,
      { ownershipId },
    );
  },

  /**
   * Adds the journey's device to the signed-in user's devices, the journey to
   * its history; a device typed in by hand joins the catalogue first. A
   * second device of a model owned only with `another`: refused with a 409
   * otherwise, the journey then naming its model.
   */
  addPersonalDevice: async (
    journeyId: string,
    another = false,
  ): Promise<{ id: string; ownershipId: string; modelId: number; deviceId: number | null }> => {
    const response = await api.post(
      `${API_URL}/v1/repair-monitor/journeys/${journeyId}/personal-device`,
      { another },
    );
    return response.data;
  },

  /** Attaches journeys recorded as a guest to the account that just signed in. */
  claim: async (tokens: string[]): Promise<{ claimed: number }> => {
    const response = await api.post(
      `${API_URL}/v1/repair-monitor/journeys/claim`,
      { tokens: recentTokens(tokens) },
    );
    return response.data;
  },
};
