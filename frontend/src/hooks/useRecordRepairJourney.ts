import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RootState } from "../stores/globalStore";
import { setJourneyId } from "../stores/repairWorkflowSlice";
import { addPendingDeclaration } from "../stores/pendingDeclarationsSlice";
import {
  repairJourneyService,
  CreateRepairJourneyDto,
  asksForOutcome,
} from "../services/repairJourneyService";

const ROUTE_BY_CHOICE: Record<string, CreateRepairJourneyDto["repairRoute"]> = {
  doItYourself: "DoItYourself",
  getHelp: "Professional",
  reuse: "Reuse",
  recycle: "Recycle",
};

/**
 * Records the finished journey so its outcome can be asked about later.
 *
 * Fires once, when the user reaches the summary having chosen a solution. The
 * journey is *not* a repair record: it stays out of the statistics until the
 * user comes back and declares what happened. That is deliberate — most
 * visitors try the wizard with made-up data.
 *
 * Works for guests, which is the point: the returned token lives in this
 * browser, so neither an account nor an email address is needed to follow up.
 *
 * @param problemTag  the AI issue tag, already classified by the caller
 * @param tagSettled  false while the classification is still running, so the
 *                    journey is not recorded without a tag it is about to get
 */
export const useRecordRepairJourney = (
  problemTag: string | undefined,
  tagSettled: boolean,
) => {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const inFlight = useRef(false);

  const {
    wizardDevice: device,
    issues,
    issueDescription,
    issueSeverity,
    issueDuration,
    productCondition,
    dispatchChoice,
    selectedDeviceType,
    journeyId,
  } = useSelector((state: RootState) => state.repairWorkflow);

  useEffect(() => {
    if (journeyId || !dispatchChoice || !tagSettled || inFlight.current) return;

    inFlight.current = true;
    const dto: CreateRepairJourneyDto = {
      deviceId: device?.device_id ? Number(device.device_id) : undefined,
      modelId: device?.model_id ?? undefined,
      brand: device?.brand,
      modelType: device?.model,
      // The untranslated name. `name` follows the reader's locale, so storing
      // it would put "Aspirateur robot" in a column the impact lookup, the
      // statistics and the imported ORDS dataset all read in English.
      productCategory:
        device?.categories?.[0]?.canonicalName ||
        device?.categories?.[0]?.name ||
        selectedDeviceType,
      problem: issueDescription || undefined,
      // The ticked symptom cards: structured, and what users actually fill in,
      // where the free text above is optional and often skipped.
      issues: issues?.length ? issues : undefined,
      problemTag,
      repairRoute: ROUTE_BY_CHOICE[dispatchChoice],
      issueSeverity,
      issueDuration,
      visualCondition: productCondition?.visualCondition,
      usageIntensity: productCondition?.usageIntensity,
      estimatedAge: productCondition?.estimatedAge,
      locale: i18n.language,
    };

    repairJourneyService
      .create(dto)
      .then((created) => {
        dispatch(
          setJourneyId({
            id: created.id,
            modelId: dto.modelId ?? null,
            deviceName: [dto.brand, dto.modelType].filter(Boolean).join(" ") || null,
          }),
        );
        dispatch(
          addPendingDeclaration({
            journeyId: created.id,
            declarationToken: created.declarationToken,
            journeyDate: new Date().toISOString(),
            brand: device?.brand,
            modelType: device?.model,
            // Kept for its token, which lists the journey in the user's repairs.
            dismissed: !asksForOutcome(dto.repairRoute),
          }),
        );
      })
      .catch((error) => {
        // Never blocks the user: a lost journey costs a statistic, not a repair.
        console.error("Could not record the repair journey:", error);
        inFlight.current = false;
      });
    // Only these three decide *whether* to record. The payload is read at call
    // time on purpose: re-running on every wizard field would record duplicates.
  }, [dispatchChoice, journeyId, tagSettled]);
};
