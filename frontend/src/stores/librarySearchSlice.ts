import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DeviceModel } from "../models/deviceModel";
import { logout, logoutUser } from "./authSlice";

/**
 * The device library's search, apart from the wizard's. The two pages share
 * one search component, and sharing its state too made each overwrite the
 * other's results (PBI 13839). Field and action names match the wizard's, so
 * the component takes one set or the other.
 */
interface LibrarySearchState {
  searchFilters: string[];
  searchFoundModels: DeviceModel[];
  searchTotalModels: number;
  searchTotalPages: number;
  searchCurrentPage: number;
  searchCategoryFacets: Record<string, number>;
}

const initialState: LibrarySearchState = {
  searchFilters: [],
  searchFoundModels: [],
  searchTotalModels: 0,
  searchTotalPages: 0,
  searchCurrentPage: 1,
  searchCategoryFacets: {},
};

const librarySearchSlice = createSlice({
  name: "librarySearch",
  initialState,
  reducers: {
    setSearchFilters: (state, action: PayloadAction<string[]>) => {
      state.searchFilters = action.payload;
    },
    setSearchFoundModels: (state, action: PayloadAction<DeviceModel[]>) => {
      state.searchFoundModels = action.payload;
    },
    setSearchPagination: (
      state,
      action: PayloadAction<{ total: number; totalPages: number; page: number }>,
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
  },
  // Cleared on sign-out like the wizard's search; the thunk ends the session
  // whether or not the server accepted it.
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState);
  },
});

export const librarySearchActions = librarySearchSlice.actions;
export default librarySearchSlice.reducer;
