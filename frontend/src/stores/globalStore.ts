import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import repairWorkflowReducer from "./repairWorkflowSlice";
import deviceReducer from "./deviceSlice";
import repairMonitorReducer from "./repairMonitorSlice";
import pendingDeclarationsReducer from "./pendingDeclarationsSlice";
import librarySearchReducer from "./librarySearchSlice";
import { setStore } from "../services/api";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PersistedState,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import storage from "redux-persist/es/storage";

// Increment this version when the Redux state shape changes in a breaking way.
// A state stored under an older version is then dropped, and every slice
// starts again from its initial state — except a guest's pendingDeclarations,
// the only copy of their journey tokens. A breaking change to that slice
// needs a migration of its own in purgeOlderVersions.
// v4: auth state gained `refreshToken`; older sessions cannot renew their token.
// v5: the wizard's search keeps device models, not catalogue entries.
const PERSIST_VERSION = 5;

// Not createMigrate({}): with no migrations it returns an older state
// unchanged, so a version bump purged nothing.
const purgeOlderVersions = async (
  state: PersistedState,
  currentVersion: number,
): Promise<PersistedState> => {
  const storedVersion = state?._persist?.version ?? -1;
  if (!state || storedVersion >= currentVersion) return state;
  const { auth, pendingDeclarations } = state as any;
  // A signed-in session ends here as on sign-out, which clears the tokens:
  // they are bearer secrets, and the account restores its journeys at the
  // next sign-in. Keys are left out rather than set to undefined: the
  // reconciler would put undefined in place of the slice, not its initial
  // state.
  return (
    pendingDeclarations && !auth?.token
      ? { _persist: state._persist, pendingDeclarations }
      : { _persist: state._persist }
  ) as PersistedState;
};

const persistConfig = {
  key: "root",
  storage,
  version: PERSIST_VERSION,
  blacklist: [],
  migrate: purgeOlderVersions,
};

const rootReducer = combineReducers({
  auth: authReducer,
  repairWorkflow: repairWorkflowReducer,
  device: deviceReducer,
  repairMonitor: repairMonitorReducer,
  // Survives resetWorkflow, logout and login on purpose: a pending declaration
  // outlives the journey that produced it, and a guest who signs in later keeps
  // the journeys recorded before they had an account.
  pendingDeclarations: pendingDeclarationsReducer,
  librarySearch: librarySearchReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(),
});

setStore(store);

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
