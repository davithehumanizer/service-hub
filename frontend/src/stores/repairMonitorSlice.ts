import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  repairMonitorService,
  CategoryStat,
  BrandStat,
  OutcomeStat,
  FailureReasonStat,
  TimeSeriesStat,
  StatsFilter,
} from '../services/repairMonitorService';

interface RepairMonitorStats {
  byCategory: CategoryStat[];
  byBrand: BrandStat[];
  byOutcome: OutcomeStat[];
  failureReasons: FailureReasonStat[];
  overTime: TimeSeriesStat[];
}

interface RepairMonitorState {
  stats: RepairMonitorStats;
  filters: StatsFilter;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  submitError: string | null;
}

const initialState: RepairMonitorState = {
  stats: {
    byCategory: [],
    byBrand: [],
    byOutcome: [],
    failureReasons: [],
    overTime: [],
  },
  filters: {},
  loading: false,
  error: null,
  submitting: false,
  submitError: null,
};

export const fetchAllStats = createAsyncThunk(
  'repairMonitor/fetchAllStats',
  async (filters: StatsFilter, { rejectWithValue }) => {
    try {
      const [byCategory, byBrand, byOutcome, failureReasons, overTime] = await Promise.all([
        repairMonitorService.getStatsByCategory(filters),
        repairMonitorService.getStatsByBrand(filters),
        repairMonitorService.getStatsByOutcome(filters),
        repairMonitorService.getStatsFailureReasons(filters),
        repairMonitorService.getStatsOverTime(filters),
      ]);
      return { byCategory, byBrand, byOutcome, failureReasons, overTime };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err.message || 'Failed to load stats');
    }
  },
);

const repairMonitorSlice = createSlice({
  name: 'repairMonitor',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<StatsFilter>) {
      state.filters = action.payload;
    },
    clearSubmitError(state) {
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAllStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearSubmitError } = repairMonitorSlice.actions;
export default repairMonitorSlice.reducer;
