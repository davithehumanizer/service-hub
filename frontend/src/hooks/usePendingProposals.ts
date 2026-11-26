import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { repairerService } from "../services/repairerService";

/** Sent by the queue after each decision, so that the menu counts again. */
export const PROPOSALS_REVIEWED = "repairer-proposals-reviewed";

/**
 * How many repairer proposals and changes wait for an administrator,
 * counted again on each page change and after each decision.
 */
export const usePendingProposals = (enabled: boolean): number => {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  const [decisions, setDecisions] = useState(0);

  useEffect(() => {
    const counted = () => setDecisions((n) => n + 1);
    window.addEventListener(PROPOSALS_REVIEWED, counted);
    return () => window.removeEventListener(PROPOSALS_REVIEWED, counted);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    repairerService
      .countPendingProposals()
      .then((n) => current && setCount(n))
      // A count that cannot be read is not shown, not an error.
      .catch(() => current && setCount(0));
    return () => {
      current = false;
    };
  }, [enabled, pathname, decisions]);

  return enabled ? count : 0;
};
