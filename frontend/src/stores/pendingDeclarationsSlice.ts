import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { logout, logoutUser } from "./authSlice";

export interface PendingDeclaration {
  journeyId: string;
  /**
   * The secret this browser was handed when it recorded the journey.
   *
   * Absent on entries restored from the server after signing in: the account
   * itself is the authorisation there, and the token is never handed back.
   */
  declarationToken?: string;
  /** ISO date; the return prompt only appears once a journey has aged. */
  journeyDate: string;
  brand?: string;
  modelType?: string;
  /** ISO date set by "not yet"; the prompt stays away until then. */
  remindAfter?: string;
  /** Answered. Kept rather than dropped: the token is also what lets this
   *  browser read the journey back on the tracking page. */
  declared?: boolean;
  /** "Not yet" was answered once; the next ask is the last (PBI 13840). */
  snoozed?: boolean;
  /** "Don't ask again": never asked here again, still answerable from the
   *  user's repairs. */
  dismissed?: boolean;
}

/** How long a journey ages before we ask, and how long "not yet" buys. */
export const DAYS_BEFORE_ASKING = 7;

/**
 * "Still in progress" is answered here, not on the server: it writes nothing,
 * so there is no reason for it to leave the browser.
 */
export const isDueForDeclaration = (
  item: PendingDeclaration,
  now: Date = new Date(),
): boolean => {
  if (item.declared || item.dismissed) return false;
  const dueFrom = item.remindAfter
    ? new Date(item.remindAfter)
    : new Date(
        new Date(item.journeyDate).getTime() +
          DAYS_BEFORE_ASKING * 24 * 60 * 60 * 1000,
      );
  return dueFrom.getTime() <= now.getTime();
};

interface PendingDeclarationsState {
  items: PendingDeclaration[];
}

const initialState: PendingDeclarationsState = { items: [] };

/**
 * Repair journeys this browser has recorded and not yet declared an outcome
 * for. This is what lets a guest be asked "did you manage to fix it?" on a
 * later visit, without an account and without us holding an email address.
 *
 * Deliberately its own slice rather than part of the wizard state, because
 * `resetWorkflow` clears the wizard between journeys and these must survive.
 */
const pendingDeclarationsSlice = createSlice({
  name: "pendingDeclarations",
  initialState,
  reducers: {
    addPendingDeclaration: (
      state,
      action: PayloadAction<PendingDeclaration>,
    ) => {
      const known = state.items.some(
        (item) => item.journeyId === action.payload.journeyId,
      );
      if (!known) {
        state.items.push(action.payload);
      }
    },
    /**
     * Restores the journeys the account owns, after signing in.
     *
     * Adds only what this browser does not already know, and never overwrites
     * an existing entry: the local one may carry a token and a snooze date the
     * server knows nothing about.
     */
    restoreAccountDeclarations: (
      state,
      action: PayloadAction<PendingDeclaration[]>,
    ) => {
      const known = new Set(state.items.map((item) => item.journeyId));
      for (const item of action.payload) {
        if (!known.has(item.journeyId)) {
          state.items.push(item);
        }
      }
    },
    // Answered, so nothing more to ask — but the entry stays, because dropping
    // it would take the token with it and the journey would disappear from the
    // guest's own history the moment they answered.
    markDeclarationDone: (state, action: PayloadAction<string>) => {
      const item = state.items.find(
        (candidate) => candidate.journeyId === action.payload,
      );
      if (item) {
        item.declared = true;
      }
    },
    snoozePendingDeclaration: (state, action: PayloadAction<string>) => {
      const item = state.items.find(
        (candidate) => candidate.journeyId === action.payload,
      );
      if (!item) return;
      // One reminder only: a second "not yet" is a "don't ask again".
      if (item.snoozed) {
        item.dismissed = true;
        return;
      }
      const later = new Date();
      later.setDate(later.getDate() + DAYS_BEFORE_ASKING);
      item.remindAfter = later.toISOString();
      item.snoozed = true;
    },
    dismissPendingDeclaration: (state, action: PayloadAction<string>) => {
      const item = state.items.find(
        (candidate) => candidate.journeyId === action.payload,
      );
      if (item) {
        item.dismissed = true;
      }
    },
  },
  extraReducers: (builder) => {
    // These tokens are bearer secrets: whoever holds them can read the journey
    // and declare its outcome. Leaving them behind on a shared computer would
    // show the next person someone else's repairs. Nothing is lost for the
    // account — the journeys are attached to it, and signing back in restores
    // them. Deliberately not cleared on login, which is exactly when the
    // adoption needs them.
    //
    // All three cases are needed. The logout button dispatches the `logoutUser`
    // thunk, not the `logout` action, so listening to `logout` alone would
    // never fire on an ordinary sign-out; and the thunk clears the session
    // whether or not the server accepted the revocation, so `rejected` counts
    // as a logout too.
    builder
      .addCase(logout, () => initialState)
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState);
  },
});

export const {
  addPendingDeclaration,
  restoreAccountDeclarations,
  markDeclarationDone,
  snoozePendingDeclaration,
  dismissPendingDeclaration,
} = pendingDeclarationsSlice.actions;

export default pendingDeclarationsSlice.reducer;
