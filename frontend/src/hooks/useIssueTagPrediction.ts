import { useEffect, useState } from "react";
import issueTagService, {
  IssueTagPrediction,
} from "../services/issueTagService";
import { getIssueLabel } from "../utils/issueMapping";

export type IssueTagStatus = "idle" | "loading" | "ready" | "empty" | "error";

// Below this, the description carries too little signal for the classifier.
export const MIN_DESCRIPTION_LENGTH = 15;

/**
 * Asks the ML classifier which part of the device the described issue comes
 * from. Used by both wizard steps that surface the tag.
 *
 * The classification used to run once on mount with an empty dependency list,
 * which made the tag appear or not depending on whether the store already held
 * the description at that moment — the intermittence reported in PBI 13778.
 * Staying subscribed to its inputs fixes that, and the returned status lets the
 * caller say what happened instead of rendering nothing.
 */
export const useIssueTagPrediction = (
  brand: string | undefined,
  model: string | undefined,
  issueDescription: string | undefined,
  issues: string[] = [],
) => {
  const [prediction, setPrediction] = useState<IssueTagPrediction | null>(null);
  const [status, setStatus] = useState<IssueTagStatus>("idle");

  // The ticked symptom cards carry the signal here: the free-text box is
  // optional and most people skip it, which left the tag empty on nearly every
  // real journey. Their labels are static English strings, which suits the
  // classifier and does not vary with the interface language.
  const symptomText = issues.map(getIssueLabel).join(", ");

  // Whether this render *will* classify, which the status alone cannot say:
  // `idle` is both the initial value and the "nothing to classify" outcome, and
  // effects only run after the first render. Callers that must wait for the tag
  // would otherwise act on the one-render window where it looks finished.
  const willClassify =
    issues.length > 0 ||
    (issueDescription ?? "").trim().length >= MIN_DESCRIPTION_LENGTH;

  useEffect(() => {
    const machine = [brand, model].filter(Boolean).join(" ").trim();
    const description = (issueDescription ?? "").trim();

    // Also resets between two wizard sessions, so a stale tag never carries
    // over to the next device.
    if (!willClassify) {
      setPrediction(null);
      setStatus("idle");
      return;
    }

    const symptoms = [symptomText, description].filter(Boolean).join(". ");
    const input = machine
      ? `machine : ${machine} ; Description : ${symptoms}`
      : `Description : ${symptoms}`;

    let cancelled = false;
    setStatus("loading");

    issueTagService
      .classify(input)
      .then((results) => {
        if (cancelled) return;
        if (results.length > 0) {
          setPrediction(results[0]);
          setStatus("ready");
        } else {
          setPrediction(null);
          setStatus("empty");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        // Still never blocks the form, but no longer fails without a trace.
        console.error("Issue tag classification failed:", error);
        setPrediction(null);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [brand, model, issueDescription, symptomText, willClassify]);

  /** True once the tag is as good as it will get — or was never coming. */
  const settled = willClassify
    ? status === "ready" || status === "empty" || status === "error"
    : true;

  return { prediction, status, settled };
};
