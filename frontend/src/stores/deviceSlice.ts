import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Device } from "../models/device";
import { logout, logoutUser, loginUser } from "./authSlice";

interface DeviceState {
  globalDevice?: Device;
}

const initialState: DeviceState = {
  globalDevice: undefined,
};

const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    setGlobalDevice: (state, action: PayloadAction<Device>) => {
      state.globalDevice = action.payload;
    },
    clearGlobalDevice: (state) => {
      state.globalDevice = undefined;
    },
  },
  extraReducers: (builder) => {
    // `logout` alone was not enough: the sign-out button dispatches the
    // `logoutUser` thunk, so the selected device survived every ordinary
    // sign-out. The thunk clears the session whether or not the server
    // accepted the revocation, so its rejection counts as a sign-out too.
    builder
      .addCase(logout, () => initialState)
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState);
  },
});

export const { setGlobalDevice, clearGlobalDevice } = deviceSlice.actions;
export default deviceSlice.reducer;
