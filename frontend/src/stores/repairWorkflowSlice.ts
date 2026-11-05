import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Device } from "../models/device";
import { DeviceModel } from "../models/deviceModel";
import { CalculateRouteResponse } from "../services/fastPlanEcoService";
import { logout, logoutUser, loginUser } from "./authSlice";

export type VisualCondition = "unknown" | "as_new" | "good" | "fair" | "poor";
export type UsageIntensity =
  | "unknown"
  | "hardly_used"
  | "light"
  | "moderate"
  | "heavy";
export type IssueSeverity = "working" | "partial" | "broken";
export type DispatchChoice = "doItYourself" | "getHelp" | "reuse" | "recycle";

export interface ProductCondition {
  estimatedAge?: number;
  visualCondition?: VisualCondition;
  usageIntensity?: UsageIntensity;
}

interface RepairWorkflowState {
  step: number;
  repairContext: "customer" | "repairer";
  wizardDevice?: Device;
  issues: string[];
  issueSeverity?: IssueSeverity;
  issueDuration?: string;
  issueDescription?: string;
  issueValidationAttempt: number;
  productCondition?: ProductCondition;
  /** Whether the user would repair it themselves; undefined until answered. */
  handy?: boolean;
  conditionValidationAttempt: number;
  allowNextStep: boolean;
  hideStepNav: boolean;
  maxStep: number;
  dispatchChoice?: DispatchChoice;
  searchFilters: string[];
  // One result per model, not per catalogue entry.
  searchFoundModels: DeviceModel[];
  searchTotalModels: number;
  searchTotalPages: number;
  searchCurrentPage: number;
  // Device count per category for the current search, straight from the
  // backend's aggregations. Kept beside the results so the category chips
  // survive a step change like the results do.
  searchCategoryFacets: Record<string, number>;
  // The model picked, kept whole so that it stays pinned on top of results
  // that no longer contain it.
  searchSelectedModel: DeviceModel | null;
  selectedDeviceType?: string;
  journeyId?: string;
  /** The model the journey was recorded with, and its device's name. */
  journeyModelId?: number | null;
  journeyDeviceName?: string | null;
  accountPromptDismissed?: boolean;
  /** The personal device the journey went into the history of. */
  journeyOwnershipId?: string;
  devicePromptDismissed?: boolean;
  ecoData?: CalculateRouteResponse | null;
  /** The model the answers were given for; kept when the device is unpicked. */
  answersFor?: string | number;
  state:
    | "initial"
    | "searching"
    | "found"
    | "notFound"
    | "repairing"
    | "repaired"
    | "notRepaired"
    | "completed";
}

const initialState: RepairWorkflowState = {
  step: 0,
  repairContext: "customer",
  wizardDevice: undefined,
  issues: [],
  issueSeverity: undefined,
  issueDuration: undefined,
  issueDescription: "",
  issueValidationAttempt: 0,
  productCondition: undefined,
  handy: undefined,
  conditionValidationAttempt: 0,
  allowNextStep: false,
  hideStepNav: false,
  maxStep: 0,
  dispatchChoice: undefined,
  searchFilters: [],
  searchFoundModels: [],
  searchTotalModels: 0,
  searchTotalPages: 0,
  searchCurrentPage: 1,
  searchCategoryFacets: {},
  searchSelectedModel: null,
  selectedDeviceType: undefined,
  journeyId: undefined,
  journeyModelId: null,
  journeyDeviceName: null,
  accountPromptDismissed: false,
  journeyOwnershipId: undefined,
  devicePromptDismissed: false,
  ecoData: null,
  state: "initial",
};

// What a journey answered about its device, and the journey recorded from it.
const answersCleared = (): Partial<RepairWorkflowState> => ({
  issues: [],
  issueSeverity: undefined,
  issueDuration: undefined,
  issueDescription: "",
  issueValidationAttempt: 0,
  productCondition: undefined,
  handy: undefined,
  conditionValidationAttempt: 0,
  maxStep: 0,
  dispatchChoice: undefined,
  ecoData: null,
  journeyId: undefined,
  journeyModelId: null,
  journeyDeviceName: null,
  accountPromptDismissed: false,
  journeyOwnershipId: undefined,
  devicePromptDismissed: false,
});

const modelKey = (device: Device) =>
  device.model_id ?? `${device.brand}|${device.model}`;

const repairWorkflowSlice = createSlice({
  name: "repairWorkflow",
  initialState,
  reducers: {
    nextStep: (state) => {
      state.step += 1;
      state.allowNextStep = false;
      state.hideStepNav = false;
      state.maxStep = Math.max(state.maxStep ?? 0, state.step);
    },
    setDispatchChoice: (
      state,
      action: PayloadAction<DispatchChoice>,
    ) => {
      state.dispatchChoice = action.payload;
    },
    clearDispatchChoice: (state) => {
      state.dispatchChoice = undefined;
    },
    prevStep: (state) => {
      state.step = Math.max(0, state.step - 1);
      state.hideStepNav = false;
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.step = action.payload;
      state.hideStepNav = false;
      if (action.payload > state.maxStep) state.maxStep = action.payload;
    },
    setDevice: (state, action: PayloadAction<Device>) => {
      // Another model is another journey: the answers were about the old one,
      // and the new one must be recorded (PBI 13840). Another variant of the
      // same model keeps them. Compared with answersFor, not wizardDevice: a
      // new search unpicks the device before the next one is picked.
      const key = modelKey(action.payload);
      if (state.answersFor !== undefined && state.answersFor !== key) {
        Object.assign(state, answersCleared());
      }
      state.answersFor = key;
      state.wizardDevice = action.payload;
      state.state = "found";
    },
    setIssues: (state, action: PayloadAction<string[]>) => {
      state.issues = action.payload;
      state.state = "repairing";
    },
    setIssueSeverity: (
      state,
      action: PayloadAction<IssueSeverity | undefined>,
    ) => {
      state.issueSeverity = action.payload;
    },
    setIssueDuration: (state, action: PayloadAction<string | undefined>) => {
      state.issueDuration = action.payload;
    },
    triggerIssueValidation: (state) => {
      state.issueValidationAttempt += 1;
    },
    triggerConditionValidation: (state) => {
      state.conditionValidationAttempt += 1;
    },
    setProductCondition: (state, action: PayloadAction<ProductCondition>) => {
      state.productCondition = action.payload;
    },
    setHandy: (state, action: PayloadAction<boolean | undefined>) => {
      state.handy = action.payload;
    },
    setAllowNextStep: (state, action: PayloadAction<boolean>) => {
      state.allowNextStep = action.payload;
    },
    setHideStepNav: (state, action: PayloadAction<boolean>) => {
      state.hideStepNav = action.payload;
    },
    setRepairContext: (
      state,
      action: PayloadAction<"customer" | "repairer">,
    ) => {
      state.repairContext = action.payload;
    },
    resetWorkflow: () => {
      return initialState;
    },
    // Set once the journey has been recorded server-side, so reaching the
    // summary again does not record it twice. Cleared with the rest of the
    // wizard, which is what makes the next journey a new one. Its device is
    // kept with it: the wizard's may change afterwards, the journey's not.
    setJourneyId: (
      state,
      action: PayloadAction<{
        id: string;
        modelId: number | null;
        deviceName: string | null;
      }>,
    ) => {
      state.journeyId = action.payload.id;
      state.journeyModelId = action.payload.modelId;
      state.journeyDeviceName = action.payload.deviceName;
    },
    setJourneyOwnership: (state, action: PayloadAction<string>) => {
      state.journeyOwnershipId = action.payload;
    },
    dismissDevicePrompt: (state) => {
      state.devicePromptDismissed = true;
    },
    // Closing the invitation to sign in keeps it closed for this journey only:
    // the next one is a fresh chance to ask, and nothing insists in between.
    dismissAccountPrompt: (state) => {
      state.accountPromptDismissed = true;
    },
    setState: (
      state,
      action: PayloadAction<
        | "initial"
        | "searching"
        | "found"
        | "notFound"
        | "repairing"
        | "repaired"
        | "notRepaired"
        | "completed"
      >,
    ) => {
      state.state = action.payload;
      return state;
    },
    setCurrentDevice: (state, action: PayloadAction<Device>) => {
      state.wizardDevice = action.payload;
    },
    clearCurrentDevice: (state) => {
      state.wizardDevice = undefined;
    },
    setIssueDescription: (state, action: PayloadAction<string>) => {
      state.issueDescription = action.payload;
    },
    setSearchFilters: (state, action: PayloadAction<string[]>) => {
      state.searchFilters = action.payload;
    },
    setSearchFoundModels: (state, action: PayloadAction<DeviceModel[]>) => {
      state.searchFoundModels = action.payload;
    },
    setSearchPagination: (
      state,
      action: PayloadAction<{
        total: number;
        totalPages: number;
        page: number;
      }>,
    ) => {
      state.searchTotalModels = action.payload.total;
      state.searchTotalPages = action.payload.totalPages;
      state.searchCurrentPage = action.payload.page;
    },
    setSearchCategoryFacets: (
      state,
      action: PayloadAction<Record<string, number>>,
    ) => {
      state.searchCategoryFacets = action.payload;
    },
    setSearchCurrentPage: (state, action: PayloadAction<number>) => {
      state.searchCurrentPage = action.payload;
    },
    setSearchSelectedModel: (
      state,
      action: PayloadAction<DeviceModel | null>,
    ) => {
      state.searchSelectedModel = action.payload;
    },
    setSelectedDeviceType: (state, action: PayloadAction<string>) => {
      state.selectedDeviceType = action.payload;
    },
    setEcoData: (
      state,
      action: PayloadAction<CalculateRouteResponse | null>,
    ) => {
      state.ecoData = action.payload;
    },
  },
  extraReducers: (builder) => {
    // `logout` alone was not enough: the sign-out button dispatches the
    // `logoutUser` thunk, so a half-finished wizard survived every ordinary
    // sign-out and greeted whoever signed in next. The thunk clears the
    // session whether or not the server accepted the revocation, so its
    // rejection counts as a sign-out too.
    builder
      .addCase(logout, () => initialState)
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState);
  },
});

export const {
  nextStep,
  prevStep,
  setDevice,
  setIssues,
  setIssueSeverity,
  setIssueDuration,
  triggerIssueValidation,
  triggerConditionValidation,
  setProductCondition,
  setHandy,
  setAllowNextStep,
  setHideStepNav,
  setRepairContext,
  setDispatchChoice,
  clearDispatchChoice,
  resetWorkflow,
  setJourneyOwnership,
  dismissDevicePrompt,
  setJourneyId,
  dismissAccountPrompt,
  setState,
  setStep,
  setCurrentDevice,
  clearCurrentDevice,
  setIssueDescription,
  setSearchFilters,
  setSearchFoundModels,
  setSearchPagination,
  setSearchCategoryFacets,
  setSearchCurrentPage,
  setSearchSelectedModel,
  setSelectedDeviceType,
  setEcoData,
} = repairWorkflowSlice.actions;
export default repairWorkflowSlice.reducer;
