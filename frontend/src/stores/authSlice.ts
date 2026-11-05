import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authService } from "../services/authService";
import { User } from "../models/user";

// Thunk pour gérer l'authentification de manière asynchrone
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const data = await authService.login(email, password);
      console.log("login data", data);
      return data;
    } catch (error) {
      console.error("Login error", error);
      return rejectWithValue(error);
    }
  },
);

// Thunk pour rafraîchir le token
// Le refresh token est à usage unique : la réponse contient son remplaçant,
// qu'il faut persister sinon le prochain refresh échouera.
export const refreshAccessToken = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state: any = getState();
      const refreshToken = state.auth.refreshToken;
      if (!refreshToken) {
        return rejectWithValue("No refresh token available");
      }
      const data = await authService.refreshToken(refreshToken);
      if (data.access_token && data.access_token !== "") {
        return {
          token: data.access_token,
          refreshToken: data.refresh_token,
        };
      }
      return rejectWithValue("Empty access token");
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// Thunk de déconnexion : révoque le refresh token côté serveur avant de vider
// l'état local.
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { getState }) => {
    const state: any = getState();
    const refreshToken = state.auth.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
  },
);

// Thunk pour vérifier l'authentification au chargement
export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const state: any = getState();
      if (state.auth.guest) {
        console.log("User is a guest, skipping token check.");
        return rejectWithValue({ isGuest: true });
      }
      const data = await authService.me(); // Vérifie le token
      return data;
    } catch (error) {
      console.warn("Token expiré, tentative de refresh...");

      // Tentative de rafraîchir le token
      const refreshResult = await dispatch(refreshAccessToken());

      // Le reducer de refreshAccessToken.fulfilled a déjà stocké le nouveau
      // couple (access token, refresh token) : il suffit de rejouer l'appel.
      if (
        refreshAccessToken.fulfilled.match(refreshResult) &&
        refreshResult.payload?.token
      ) {
        const { data } = await authService.me();
        return data;
      }

      return rejectWithValue(error);
    }
  },
);

interface AuthState {
  guest: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  userDevicesLastUpdated: number | null;
  latitude: number | null;
  longitude: number | null;
  geolocationSource: GeolocationSource | null;
}

type GeolocationSource = "browser" | "ip" | "profile" | "manual" | "map";

type GeolocationPayload = PayloadAction<{
  latitude: number;
  longitude: number;
  source: GeolocationSource;
}>;

const applyGeolocation = (state: AuthState, action: GeolocationPayload) => {
  state.latitude = action.payload.latitude;
  state.longitude = action.payload.longitude;
  state.geolocationSource = action.payload.source;
  console.log(
    `Geolocation set from ${action.payload.source}:`,
    action.payload.latitude,
    action.payload.longitude,
  );
};

// Définition du type utilisateur

const initialState: AuthState = {
  guest: true,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  userDevicesLastUpdated: null,
  latitude: null,
  longitude: null,
  geolocationSource: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      console.log("logout");
      state.guest = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    /**
     * Installs a full session (access + refresh token) obtained outside the
     * password flow — currently the social login redirect.
     */
    setSession: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string | null }>,
    ) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    updateProfile: (state, action: PayloadAction<any>) => {
      if (state.user) state.user = { ...state.user, profile: action.payload };
    },
    setGuest: (state, action: PayloadAction<boolean>) => {
      console.log("setGuest", action.payload);
      state.guest = action.payload;
    },
    userDevicesUpdated: (state) => {
      state.userDevicesLastUpdated = Date.now();
    },
    /** A location the user asked for: always applied. */
    setGeolocation: applyGeolocation,
    /**
     * A location found on its own at start-up (profile address, GPS, IP). It
     * never replaces one the user chose: the GPS answer could land seconds
     * after an address was typed, and every reload re-detected, so the map
     * kept going back to where the browser was.
     */
    setDetectedGeolocation: (state, action: GeolocationPayload) => {
      if (state.geolocationSource === "manual" || state.geolocationSource === "map") return;
      applyGeolocation(state, action);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        console.log("Login pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log("Login fulfilled");
        state.loading = false;
        state.guest = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.warn("Login rejected", action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        console.log("refreshAccessToken fulfilled");
        state.token = action.payload?.token ?? null;
        state.refreshToken = action.payload?.refreshToken ?? null;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Refresh token consumed, revoked or expired: the session is over.
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      // La déconnexion locale ne dépend pas du succès de la révocation
      // serveur : si l'appel échoue, la session doit être vidée quand même.
      .addCase(logoutUser.fulfilled, (state) => {
        state.guest = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.guest = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        console.log("checkAuth fulfilled", action.payload);
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state, action: any) => {
        console.warn("checkAuth rejected, resetting user and token");
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        if (action.payload && action.payload.isGuest) {
          state.guest = true;
        } else if (
          action.payload &&
          action.payload.status &&
          action.payload.status === 403
        ) {
          state.guest = true;
        }
      });
  },
});

export const {
  logout,
  setToken,
  setSession,
  updateProfile,
  setGuest,
  userDevicesUpdated,
  setGeolocation,
  setDetectedGeolocation,
} = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUserType = (state: {
  auth: AuthState;
}): "customer" | "repairer" | "admin" | null => {
  const roleName = state.auth.user?.role?.name;
  if (roleName === "admin") return "admin";
  if (roleName === "repairer") return "repairer";
  if (roleName === "user") return "customer";
  return null;
};

export const selectNeedsOnboarding = (state: { auth: AuthState }): boolean => {
  const user = state.auth.user;
  if (!user) return false;
  return user.profile?.onboardingCompleted === false;
};
