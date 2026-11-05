import type { AppDispatch } from "../stores/globalStore";
import { resetWorkflow } from "../stores/repairWorkflowSlice";

// A journey left in the store by an earlier visit is offered to resume or
// replace once per browser session (PBI 13840); within the session the wizard
// simply resumes it. sessionStorage ends with the tab, and survives a reload.
const KEY = "wizard.journeyCurrent";

export const isJourneyCurrent = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

export const markJourneyCurrent = () => {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Without storage the question is asked again, which does no harm.
  }
};

/** Clears the wizard for a journey that starts now. */
export const startNewJourney = (dispatch: AppDispatch) => {
  dispatch(resetWorkflow());
  markJourneyCurrent();
};
