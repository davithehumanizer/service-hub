import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { RootState } from "../../../stores/globalStore";
import {
  DispatchChoice,
  setAllowNextStep,
  setDispatchChoice,
  setEcoData  ,
} from "../../../stores/repairWorkflowSlice";
import { repairerService } from "../../../services/repairerService";
import { deviceService } from "../../../services/deviceService"; // Import deviceService
import { haversineDistance } from "../../../utils/geolocation"; // Import haversineDistance
import { costEstimationService } from "../../../services/costEstimationService"; // Import costEstimationService
import { CalculateRouteResponse, fastPlanEcoService } from "../../../services/fastPlanEcoService";
import { tutorialSubscriptionService } from "../../../services/tutorialSubscriptionService";
import sparePartsService from "../../../services/sparePartsService";
import { Skeleton, Modal, TextInput, Button } from "@mantine/core";
import { computeRepairScore } from "../../../utils/issueMapping";
import { getIssueTagInfo } from "../../../utils/issueTagMapping";
import {
  componentsForIssues,
  componentsLabel,
  isAboutComponents,
} from "../../../utils/tutorialComponents";
import { searchCategory } from "../../../utils/tutorialsPath";
import { useIssueTagPrediction } from "../../../hooks/useIssueTagPrediction";
import { useNearbyReuse } from "../../../hooks/useNearbyReuse";
import repairYourselfImg from "../../../assets/img/repair-yourself.png";
import repairerImg from "../../../assets/img/repairer.png";

type RepairChoice = "doItYourself" | "getHelp";
// The order testers asked for; a recommended option goes before it.
const DEFAULT_ORDER: RepairChoice[] = ["getHelp", "doItYourself"];

export default function Dispatch() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { latitude, longitude } = useSelector((state: RootState) => state.auth);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { selectedDeviceType, wizardDevice, dispatchChoice, issues, issueSeverity, productCondition, handy, issueDescription, repairContext } = useSelector(
    (state: RootState) => state.repairWorkflow
  );
  const isRepairer = repairContext === "repairer";

  // Compute recommendation from score
  const recommendation = computeRepairScore({ issues, issueSeverity, productCondition, handy });
  const order = recommendation
    ? [recommendation, ...DEFAULT_ORDER.filter((c) => c !== recommendation)]
    : DEFAULT_ORDER;

  const { nearby: nearbyReuse, loading: isReuseLoading } = useNearbyReuse();

  const { prediction: issuePrediction, status: predictionStatus } =
    useIssueTagPrediction(
      wizardDevice?.brand,
      wizardDevice?.model,
      issueDescription,
      issues,
    );

  const [nearestRepairerDistance, setNearestRepairerDistance] = useState<
    number | null
  >(null);
  const [isRepairerLoading, setIsRepairerLoading] = useState(false);
  const [isTutorialsLoading, setIsTutorialsLoading] = useState(false);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [isComponentsLoading, setIsComponentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorialCount, setTutorialCount] = useState<number | null>(null); // New state for tutorial count
  const [tutorialGuides, setTutorialGuides] = useState<{ title?: string; subject?: string }[]>([]);
  // A Fairphone 6 diagnosed with its battery was offered "2 tutorials", both
  // about other parts: count those about the diagnosed part.
  const tutorialComponents = componentsForIssues(issues, issuePrediction?.label);
  const componentTutorialCount = tutorialGuides.filter((guide) =>
    isAboutComponents(guide, tutorialComponents),
  ).length;
  const [doItYourselfCost, setDoItYourselfCost] = useState<{
    minCost: number;
    maxCost: number;
  } | null>(null); // New state for do it yourself cost
  const [getHelpCost, setGetHelpCost] = useState<{
    minCost: number;
    maxCost: number;
  } | null>(null); // New state for get help cost
  const [componentCount, setComponentCount] = useState<number | null>(null);
  const [repairerCount, setRepairerCount] = useState<number | null>(null);
  const [ecoData, setStateEcoData] = useState<CalculateRouteResponse | null>(null);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (authUser?.email) setNotifyEmail(authUser.email);
  }, [authUser]);

  const handleSubscribeToTutorialNotification = async () => {
    if (!notifyEmail) return;
    setNotifyStatus("loading");
    try {
      await tutorialSubscriptionService.subscribe({
        email: notifyEmail,
        deviceId: wizardDevice?.device_id ? String(wizardDevice.device_id) : undefined,
        modelId: wizardDevice?.model_id ?? undefined,
        issueTypes: issues,
        locale: i18n.language,
      });
      setNotifyStatus("success");
    } catch (err) {
      console.error("Error subscribing to tutorial notification:", err);
      setNotifyStatus("error");
    }
  };


  useEffect(() => {
    // Allow next step only if a choice has been made
    dispatch(
      setAllowNextStep(dispatchChoice !== null && dispatchChoice !== undefined)
    );
  }, [dispatch, dispatchChoice]);

  useEffect(() => {
    const fetchNearestRepairer = async () => {
      if (latitude && longitude && (selectedDeviceType || wizardDevice)) {
        setIsRepairerLoading(true);
        setError(null);
        try {
          let deviceTypeToSearch = selectedDeviceType;
          if(wizardDevice){
            if(wizardDevice.categories && wizardDevice.categories?.length > 0){
              deviceTypeToSearch = wizardDevice.categories[0].name;
            }else if(wizardDevice.device_type && wizardDevice.device_type.length > 0){
              deviceTypeToSearch = wizardDevice.device_type;
            }
          }

          // Repairers only, as on the map this card opens: recyclers and
          // second-hand shops are counted by the cards below.
          const searchDto = {
            filters: { device_type: deviceTypeToSearch ?? "", partner_type: "repairer" },
            latitude,
            longitude,
            search: "",
          };
          const repairers = await repairerService.search(searchDto);
          setRepairerCount(repairers.length);
          if (repairers && repairers.length > 0) {
            // Calculate distance using the utility function
            const distance = haversineDistance(
              latitude,
              longitude,
              repairers[0].latitude,
              repairers[0].longitude
            );
            setNearestRepairerDistance(distance);

            const ecoData = await fastPlanEcoService.calculateRoute({
              baseAddress: { address: "", lat: latitude, lng: longitude },
              followingAddresses: [
                {
                  address: repairers[0].address,
                  lat: repairers[0].latitude,
                  lng: repairers[0].longitude,
                },
              ],
              vehicle: "car",
            });
            console.log("Eco data:", ecoData);
            setStateEcoData(ecoData);
            dispatch(setEcoData(ecoData));

          } else {
            dispatch(setEcoData(null));
            setNearestRepairerDistance(null);
          }
        } catch (err) {
          console.error("Error fetching nearest repairer:", err);
          setError("Failed to find nearest repairer.");
          setNearestRepairerDistance(null);
          setRepairerCount(null);
        } finally {
          setIsRepairerLoading(false);
        }
      } else {
        setNearestRepairerDistance(null);
        setRepairerCount(null);
      }
    };

    fetchNearestRepairer();
  }, [latitude, longitude, selectedDeviceType, wizardDevice, dispatch]);

  // New useEffect to fetch iFixit tutorial count
  useEffect(() => {
    const fetchTutorialCount = async () => {
      const query = wizardDevice?.model || selectedDeviceType || "";
      if (query) {
        setIsTutorialsLoading(true);
        try {
          const response = await deviceService.searchIfixit(
            query,
            "",
            "",
            "",
            wizardDevice?.brand,
            searchCategory(wizardDevice?.categories) || selectedDeviceType,
            // As the tutorials page searches, so both count the same guides.
            wizardDevice?.categories?.[0]?.ifixit_wikiid ?? undefined,
          );
          const data = response.data; // Extract the actual data from the API gateway response
          const results = data.results || data;
          setTutorialCount(results.length);
          setTutorialGuides(Array.isArray(results) ? results : []);
        } catch (err) {
          console.error("Error fetching iFixit tutorial count:", err);
          setTutorialCount(null); // Reset or handle error appropriately
          setTutorialGuides([]);
        } finally {
          setIsTutorialsLoading(false);
        }
      } else {
        setTutorialCount(0); // No device or category selected, so no tutorials
        setTutorialGuides([]);
      }
    };

    fetchTutorialCount();
  }, [wizardDevice, selectedDeviceType]); // Re-run when wizardDevice or selectedDeviceType changes

  // New useEffect to fetch estimated costs
  useEffect(() => {
    const fetchEstimatedCosts = async () => {
      if (wizardDevice && wizardDevice.model) {
        setIsCostLoading(true);
        try {
          const doItYourself = await costEstimationService.getEstimatedCost(
            "doItYourself",
            //wizardDevice.model
          );
          setDoItYourselfCost(doItYourself);

          const getHelp = await costEstimationService.getEstimatedCost(
            "getHelp",
            //wizardDevice.model
          );
          setGetHelpCost(getHelp);
        } catch (err) {
          console.error("Error fetching estimated costs:", err);
          setDoItYourselfCost(null);
          setGetHelpCost(null);
        } finally {
          setIsCostLoading(false);
        }
      } else {
        setDoItYourselfCost(null);
        setGetHelpCost(null);
      }
    };

    fetchEstimatedCosts();
  }, [wizardDevice]); // Re-run when wizardDevice changes

  // The same count as the device page's spare parts tab. A category alone, a
  // device entered without its model, or a catalogue that does not answer,
  // shows none.
  useEffect(() => {
    const fetchComponentCount = async () => {
      if (wizardDevice?.brand && wizardDevice.model) {
        setIsComponentsLoading(true);
        try {
          const result = await sparePartsService.searchByDevice({
            brand: wizardDevice.brand,
            model: wizardDevice.model,
            limit: 1,
          });
          setComponentCount(result.estimatedTotalHits ?? 0);
        } catch (err) {
          console.error("Error fetching component count for device:", err);
          setComponentCount(0);
        } finally {
          setIsComponentsLoading(false);
        }
      } else {
        setComponentCount(0);
      }
    };

    fetchComponentCount();
  }, [wizardDevice, selectedDeviceType]);

  // The category travels by its untranslated name; the label comes from the
  // categories endpoint, in the active language.
  const [categoryLabels, setCategoryLabels] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    deviceService
      .getCategories()
      .then((cats) => setCategoryLabels(new Map(cats.map((c) => [c.canonicalName ?? c.name, c.name]))))
      .catch(() => setCategoryLabels(new Map()));
  }, [i18n.language]);

  const category = wizardDevice?.categories?.[0]?.canonicalName
    ?? wizardDevice?.categories?.[0]?.name
    ?? selectedDeviceType;
  const categoryLabel = category ? categoryLabels.get(category) ?? category : "";
  // The model when there is one; otherwise brand and category, or the category.
  const deviceLabel = wizardDevice?.model
    || [wizardDevice?.brand, categoryLabel].filter(Boolean).join(" ");

  const handleChoice = (choice: DispatchChoice) => {
    dispatch(setDispatchChoice(choice));
  };

  // Smaller than the repair cards, which stay the answer this step is for.
  const notRepairingCard = (
    choice: "reuse" | "recycle",
    icon: string,
    title: string,
    detail: React.ReactNode,
  ) => (
    <button
      type="button"
      key={choice}
      onClick={() => handleChoice(choice)}
      aria-pressed={dispatchChoice === choice}
      className={`flex items-start gap-3 text-left rounded-2xl border p-4 bg-white dark:bg-gray-900 transition-colors hover:border-customgreen-500 ${
        dispatchChoice === choice
          ? "border-customgreen-500 shadow-lg"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
          dispatchChoice === choice
            ? "bg-customgreen-500 text-white"
            : "bg-customgreen-50 text-customgreen-700 dark:bg-gray-800 dark:text-customgreen-300"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold text-gray-900 dark:text-white">{title}</span>
        <span className="block mt-1 text-sm text-gray-600 dark:text-gray-400">{detail}</span>
      </span>
    </button>
  );

  // In the flow on a phone, where the card has no banner to sit on. On a wide
  // card the illustration is a square beside the text (whole, not cropped to a
  // strip), and the badge sits on its corner rather than over the title.
  const recommendedBadge = (
    <span className="self-start mx-4 mt-4 md:m-0 md:absolute md:top-3 md:right-3 xl:left-3 xl:right-auto z-10 bg-customgreen-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
      <span className="material-symbols-outlined text-sm">recommend</span>
      {t('wizard.dispatch.recommended')}
    </span>
  );

  return (
    <div className="space-y-6">

      {/* ── Issue origin prediction banner ────────────────────────────── */}
      {predictionStatus === 'loading' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          {t('wizard.analysing')}
        </div>
      )}

      {/* An empty or failed classification used to render nothing at all, which
          read as the intermittent bug. Say so instead. */}
      {(predictionStatus === 'empty' || predictionStatus === 'error') && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-base">search_off</span>
          {t('wizard.predictionUnavailable')}
        </div>
      )}

      {/* A repairer reads the category; anyone else, a sentence: "Behaviour /
          Symptom" told a tester nothing about what to do. */}
      {issuePrediction && predictionStatus === 'ready' && (() => {
        const info = getIssueTagInfo(issuePrediction.label);
        return (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-customgreen-500 bg-customgreen-50 dark:bg-customgreen-900/20 text-sm font-medium text-customgreen-700 dark:text-customgreen-300">
            <span className="material-symbols-outlined text-base text-customgreen-500">
              {isRepairer ? "search_insights" : info.icon}
            </span>
            {isRepairer ? (
              <span>
                {t('wizard.systemPredicts')}{" "}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${info.badgeClasses}`}>
                  <span className="material-symbols-outlined text-xs">{info.icon}</span>
                  {t(info.displayKey)}
                </span>
              </span>
            ) : (
              <span>{t(info.sentenceKey)}</span>
            )}
          </div>
        );
      })()}

      {deviceLabel && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('wizard.dispatch.for')}{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{deviceLabel}</span>
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {[
          // ── DIY card ──────────────────────────────────────────────────────
          <div
            key="doItYourself"
            className={`relative flex flex-col xl:flex-row overflow-hidden rounded-2xl border ${
              dispatchChoice === "doItYourself"
                ? "border-customgreen-500 shadow-lg shadow-customgreen-500/50"
                : "border-gray-200 dark:border-gray-800"
            } bg-white dark:bg-gray-900 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/20 cursor-pointer`}
            onClick={() => handleChoice("doItYourself")}
          >
            {recommendation === "doItYourself" && recommendedBadge}
            <div
              className="hidden md:block h-36 w-full bg-cover xl:w-40 xl:h-40 xl:m-6 xl:mr-0 xl:rounded-xl xl:flex-shrink-0"
              style={{
                backgroundImage: `url(${repairYourselfImg})`,
                backgroundPosition: "center 15%",
              }}
            ></div>
            <div className="flex flex-1 flex-col justify-between p-4 md:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="md:hidden w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${repairYourselfImg})`,
                    }}
                  ></div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('wizard.dispatch.diyTitle')}
                  </h3>
                </div>
                {/* Always open, even with no tutorial and no part: the visitor
                    may know their own way to repair it. */}
                <>
                  {isTutorialsLoading ? (
                    <Skeleton height={20} mt={15} width="70%" />
                  ) : (
                    <p className="mt-4 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                      <span
                        className={`material-symbols-outlined text-base ${
                          dispatchChoice === "doItYourself"
                            ? "text-customgreen-500"
                            : "text-gray-400 dark:text-gray-100"
                        } group-hover:text-customgreen-500 transition-colors duration-300`}
                      >
                        build
                      </span>
                      <span>
                        {tutorialCount && tutorialCount > 0 && tutorialComponents.length > 0 ? (
                          componentTutorialCount > 0
                            ? t('wizard.dispatch.tutorialsForComponents', {
                                count: componentTutorialCount,
                                components: componentsLabel(t, tutorialComponents),
                              })
                            : t('wizard.dispatch.otherTutorialsOnly', {
                                count: tutorialCount,
                                components: componentsLabel(t, tutorialComponents),
                              })
                        ) : tutorialCount && tutorialCount > 0 ? (
                          <>
                            <span className="text-gray-900 dark:text-gray-100">
                              {tutorialCount}{" "}
                            </span>
                            {t('wizard.dispatch.tutorialsAvailable')}
                          </>
                        ) : (
                          t('wizard.dispatch.noTutorials')
                        )}
                      </span>
                    </p>
                  )}
                  {/* Only what is this card's own: finding a repairer is the next
                      card, and the summary offers the other ways out. */}
                  {!isTutorialsLoading && !tutorialCount && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNotifyModalOpen(true);
                      }}
                      className="mt-2 flex items-center gap-2 text-sm font-medium text-left text-customgreen-700 dark:text-customgreen-300 hover:underline"
                    >
                      <span className="material-symbols-outlined text-base">notifications</span>
                      {t('wizard.dispatch.notifyMe.button')}
                    </button>
                  )}
                  {isComponentsLoading ? (
                    <Skeleton height={20} mt={10} width="60%" />
                  ) : (
                    !!componentCount && (
                      <p className="mt-2 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            dispatchChoice === "doItYourself"
                              ? "text-customgreen-500"
                              : "text-gray-400 dark:text-gray-100"
                          } group-hover:text-customgreen-500 transition-colors duration-300`}
                        >
                          settings
                        </span>
                        <span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {componentCount}{" "}
                          </span>{" "}
                          {t('wizard.dispatch.spareParts')}
                        </span>
                      </p>
                    )
                  )}
                  {isCostLoading ? (
                    <Skeleton height={20} mt={10} width="80%" />
                  ) : (
                    doItYourselfCost && (
                      <p className="mt-2 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            dispatchChoice === "doItYourself"
                              ? "text-customgreen-500"
                              : "text-gray-400 dark:text-gray-100"
                          } group-hover:text-customgreen-500 transition-colors duration-300`}
                        >
                          payments
                        </span>
                        <span>
                          {t('wizard.dispatch.estimatedCost')}{" "}
                          <span className="text-gray-900 dark:text-gray-100 ">
                            {doItYourselfCost.minCost}€ - {doItYourselfCost.maxCost}€
                          </span>
                        </span>
                      </p>
                    )
                  )}
                </>
              </div>
            </div>
          </div>,
          // ── Get Help card as relative for badge ───────────────────────────
          <div
            key="getHelp"
            className={`relative flex flex-col xl:flex-row overflow-hidden rounded-2xl border ${
              dispatchChoice === "getHelp"
                ? "border-customgreen-500 shadow-lg shadow-customgreen-500/50"
                : "border-gray-200 dark:border-gray-800"
            } bg-white dark:bg-gray-900 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/20 cursor-pointer`}
            onClick={() => handleChoice("getHelp")}
          >
            {recommendation === "getHelp" && recommendedBadge}
            <div
              className="hidden md:block h-36 w-full bg-cover xl:w-40 xl:h-40 xl:m-6 xl:mr-0 xl:rounded-xl xl:flex-shrink-0"
              style={{
                backgroundImage: `url(${repairerImg})`,
                backgroundPosition: "center 15%",
              }}
            ></div>
            <div className="flex flex-1 flex-col justify-between p-4 md:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="md:hidden w-12 h-12 rounded-full bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${repairerImg})`,
                    }}
                  ></div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('wizard.dispatch.getHelpTitle')}
                  </h3>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {isRepairerLoading ? (
                  <>
                    <Skeleton height={20} mt={15} width="70%" />
                    <Skeleton height={20} mt={10} width="60%" />
                    <Skeleton height={20} mt={10} width="80%" />
                    <Skeleton height={20} mt={10} width="50%" />
                  </>
                ) : (
                  <>
                   {repairerCount !== null && (
                      <p className="mt-4 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            dispatchChoice === "getHelp"
                              ? "text-customgreen-500"
                              : "text-gray-400 dark:text-gray-100"
                          } group-hover:text-customgreen-500 transition-colors duration-300`}
                        >
                          group
                        </span>
                        <span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {repairerCount}{" "}
                          </span>
                          {t('wizard.dispatch.professionalsFound')}
                        </span>
                      </p>
                    )}
                    {nearestRepairerDistance !== null && (
                      <p className="mt-2 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            dispatchChoice === "getHelp"
                              ? "text-customgreen-500"
                              : "text-gray-400 dark:text-gray-100"
                          } group-hover:text-customgreen-500 transition-colors duration-300`}
                        >
                          distance
                        </span>
                        <span>
                          {t('wizard.dispatch.nearestRepairer')}{" "}
                          <span className="text-gray-900 dark:text-gray-100">
                            {nearestRepairerDistance.toFixed(2)} {t('wizard.dispatch.km')}{" "}
                          </span>
                          {t('wizard.dispatch.away')}
                        </span>
                      </p>
                    )}
                    {ecoData && (
                      <p className="mt-2 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                        <span
                          className={`material-symbols-outlined text-base ${
                            dispatchChoice === "getHelp"
                              ? "text-customgreen-500"
                              : "text-gray-400 dark:text-gray-100"
                          } group-hover:text-customgreen-500 transition-colors duration-300`}
                        >
                          schedule
                        </span>
                        <span>
                          {t('wizard.dispatch.travelTime')}{" "}
                          <span className="text-gray-900 dark:text-gray-100">
                            {ecoData.totalTime.toFixed(0)} {t('wizard.dispatch.minutes')}
                          </span>
                        </span>
                      </p>
                    )}
                 
                  </>
                )}
                {isCostLoading ? (
                  <Skeleton height={20} mt={10} width="80%" />
                ) : (
                  getHelpCost && (
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-400 flex items-center space-x-2">
                      <span
                        className={`material-symbols-outlined text-base ${
                          dispatchChoice === "getHelp"
                            ? "text-customgreen-500"
                            : "text-gray-400 dark:text-gray-100"
                        } group-hover:text-customgreen-500 transition-colors duration-300`}
                      >
                        payments
                      </span>
                      <span>
                        {t('wizard.dispatch.estimatedCost')}{" "}
                        <span className="text-gray-900 dark:text-gray-100">
                          {getHelpCost.minCost}€ - {getHelpCost.maxCost}€
                        </span>
                      </span>
                    </p>
                  )
                )}
              </div>
            </div>
          </div>,

        ].sort((a, b) => order.indexOf(a.key as RepairChoice) - order.indexOf(b.key as RepairChoice))}
      </div>

      {/* Not repairing: a second life before recycling (PBI 13851). */}
      <section aria-labelledby="dispatch-not-repairing" className="space-y-3">
        <h3
          id="dispatch-not-repairing"
          className="text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          {t('wizard.dispatch.notRepairing')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {notRepairingCard(
            "reuse",
            "volunteer_activism",
            t('wizard.dispatch.reuseTitle'),
            isReuseLoading ? (
              <span className="inline-block h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : nearbyReuse?.count ? (
              <>
                {t('wizard.dispatch.reuseNearby', { count: nearbyReuse.count })}
                {nearbyReuse.nearestKm !== null && (
                  <> · {t('wizard.dispatch.reuseNearest', { distance: nearbyReuse.nearestKm.toFixed(1) })}</>
                )}
              </>
            ) : (
              t('wizard.dispatch.reuseAdvice')
            ),
          )}
          {notRepairingCard(
            "recycle",
            "recycling",
            t('wizard.dispatch.recycleTitle'),
            t('wizard.dispatch.recycleMaterials'),
          )}
        </div>
      </section>

      {/* ── Tutorial notification subscription modal ──────────────────── */}
      <Modal
        opened={isNotifyModalOpen}
        onClose={() => {
          setIsNotifyModalOpen(false);
          setNotifyStatus("idle");
        }}
        title={t('wizard.dispatch.notifyMe.button')}
      >
        {notifyStatus === "success" ? (
          <p className="text-sm text-customgreen-700 dark:text-customgreen-300">
            {t('wizard.dispatch.notifyMe.confirmation')}
          </p>
        ) : (
          <div className="space-y-4">
            <TextInput
              label={t('wizard.dispatch.notifyMe.emailLabel')}
              placeholder="you@example.com"
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.currentTarget.value)}
            />
            {notifyStatus === "error" && (
              <p className="text-sm text-red-500">{t('wizard.dispatch.notifyMe.error')}</p>
            )}
            <Button
              fullWidth
              color="customgreen"
              loading={notifyStatus === "loading"}
              disabled={!notifyEmail}
              onClick={handleSubscribeToTutorialNotification}
            >
              {t('wizard.dispatch.notifyMe.button')}
            </Button>
          </div>
        )}
      </Modal>

    </div>
  );
}

