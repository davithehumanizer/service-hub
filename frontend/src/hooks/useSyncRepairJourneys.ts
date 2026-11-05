import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../stores/globalStore";
import { useNotification } from "../context/NotificationContext";
import { restoreAccountDeclarations } from "../stores/pendingDeclarationsSlice";
import { asksForOutcome, repairJourneyService } from "../services/repairJourneyService";

/**
 * Reconciles this browser's repair journeys with the account that just signed
 * in, in that order:
 *
 * 1. **adopt** — attach the journeys recorded here anonymously, so they survive
 *    a cleared storage and follow the user to another device;
 * 2. **restore** — bring back the journeys the account already owns, which this
 *    browser has never seen or has forgotten since the last sign-out.
 *
 * Without the second step the tracking page would still list everything (it
 * reads the server), but the reminder banner would not: it works off local
 * state, so a user signing in on a new device — or back in after signing out —
 * would never be asked how their repair went.
 *
 * Restored entries carry no token; the account owns them, which the server
 * accepts as authorisation on its own.
 */
export const useSyncRepairJourneys = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const items = useSelector(
    (state: RootState) => state.pendingDeclarations.items,
  );
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ? String(user.id) : null;
    if (!userId || syncedFor.current === userId) return;

    syncedFor.current = userId;
    const tokens = items
      .map((item) => item.declarationToken)
      .filter((token): token is string => Boolean(token));

    const sync = async () => {
      if (tokens.length) {
        const { claimed } = await repairJourneyService.claim(tokens);
        // Silent when nothing moved: the server only counts journeys it had not
        // already attached, so signing in again says nothing.
        if (claimed > 0) {
          showNotification(
            t("journeyPrompt.adopted", { count: claimed }),
            "success",
          );
        }
      }

      const journeys = await repairJourneyService.list(tokens);
      dispatch(
        restoreAccountDeclarations(
          journeys
            .filter((journey) => journey.status === "Pending")
            .map((journey) => ({
              journeyId: journey.id,
              journeyDate: journey.journeyDate,
              brand: journey.brand,
              modelType: journey.modelType,
              dismissed: !asksForOutcome(journey.repairRoute),
            })),
        ),
      );
    };

    sync().catch((error) => {
      // Nothing is lost: the journeys stay declarable from this browser, and
      // the tracking page reads the server directly.
      console.error("Could not sync repair journeys with the account:", error);
      syncedFor.current = null;
    });
  }, [user, items]);
};
