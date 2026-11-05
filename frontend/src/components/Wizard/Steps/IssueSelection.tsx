import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { RootState } from "../../../stores/globalStore";
import {
  setIssues,
  setIssueSeverity,
  setIssueDuration,
  setIssueDescription,
  setAllowNextStep,
} from "../../../stores/repairWorkflowSlice";
import { Select, Textarea } from "@mantine/core";
import {
  IssueCategory,
  ISSUE_DURATION_OPTIONS,
  getIssueCategoriesForDevice,
} from "../../../utils/issueMapping";

// Already says the device does not work at all.
const ANSWERS_SEVERITY = "no_power";

const FIELD_ERROR_CLASSES =
  "flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300";

const chipClasses = (selected: boolean) =>
  `flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-customgreen-500 ${
    selected
      ? "border-customgreen-500 bg-customgreen-50 dark:bg-white text-gray-900 shadow-sm"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-customgreen-400 hover:bg-gray-50 dark:hover:bg-gray-700"
  }`;

export default function IssueSelection() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { issues, issueSeverity, issueDuration, issueDescription, issueValidationAttempt, wizardDevice } = useSelector(
    (state: RootState) => state.repairWorkflow
  );

  // A washing machine was being asked about its screen and its camera: the
  // symptoms now come from the device's own family.
  const issueCategories = getIssueCategoriesForDevice(wizardDevice);

  // Words or a symptom: either says what the problem is.
  const problemGiven = issues.length > 0 || (issueDescription ?? "").trim().length > 0;

  const errorRef = useRef<HTMLDivElement>(null);
  const [invalid, setInvalid] = useState(false);

  // Zones first, their symptoms once opened. A zone holding a single symptom
  // is that symptom, so it never opens.
  const [openZones, setOpenZones] = useState<string[]>(() =>
    issueCategories
      .filter((c) => c.issues.length > 1 && c.issues.some((i) => issues.includes(i.key)))
      .map((c) => c.key),
  );

  useEffect(() => {
    dispatch(setAllowNextStep(problemGiven));
  }, [problemGiven, dispatch]);

  // Clear the highlight as soon as the problem is given
  useEffect(() => {
    if (problemGiven && invalid) setInvalid(false);
  }, [problemGiven, invalid]);

  // Triggered by the Wizard "Next" button when the step is incomplete. Only a
  // press made here counts: the count lives in the store for the whole
  // journey, so a later visit showed the error before anything was pressed.
  const seenAttempt = useRef(issueValidationAttempt);
  useEffect(() => {
    if (issueValidationAttempt === seenAttempt.current) return;
    seenAttempt.current = issueValidationAttempt;
    if (!problemGiven) setInvalid(true);
  }, [issueValidationAttempt]);

  // The message itself, once rendered, to the middle of the screen: centring
  // the whole block left its foot under the sticky buttons.
  useEffect(() => {
    if (invalid) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [invalid, issueValidationAttempt]);

  // Going back and picking another device leaves symptoms ticked that its
  // family does not offer — they would travel to the summary and the journey
  // without ever being shown here again.
  useEffect(() => {
    const offered = new Set(
      issueCategories.flatMap((category) => category.issues.map((issue) => issue.key)),
    );
    const kept = issues.filter((key) => offered.has(key));
    if (kept.length !== issues.length) {
      dispatch(setIssues(kept));
    }
  }, [wizardDevice]);

  const updateIssues = (updated: string[]) => {
    dispatch(setIssues(updated));
    // Its question is not asked while that symptom is ticked.
    const had = issues.includes(ANSWERS_SEVERITY);
    const has = updated.includes(ANSWERS_SEVERITY);
    if (has && !had) dispatch(setIssueSeverity("broken"));
    if (had && !has) dispatch(setIssueSeverity(undefined));
  };

  const toggleIssue = (key: string) => {
    updateIssues(
      issues.includes(key) ? issues.filter((i) => i !== key) : [...issues, key],
    );
  };

  const toggleZone = (category: IssueCategory) => {
    if (category.issues.length === 1) {
      toggleIssue(category.issues[0].key);
    } else if (openZones.includes(category.key)) {
      // A closed zone keeps no hidden choice.
      setOpenZones(openZones.filter((k) => k !== category.key));
      const keys = category.issues.map((i) => i.key);
      updateIssues(issues.filter((k) => !keys.includes(k)));
    } else {
      setOpenZones([...openZones, category.key]);
    }
  };

  const zoneLabel = (category: IssueCategory) =>
    t(`wizard.issue.categories.${category.key}`, { defaultValue: category.label });

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Bloc 1: the problem, in words or by its symptoms ─────────────── */}
      {/* No heading of its own: the step's title already asks the question. */}
      {/* A ring around the block, pulled out by a negative margin, reached
          the card's edges on a phone. */}
      <div className="space-y-4">
        {invalid && (
          <div ref={errorRef} role="alert" className={FIELD_ERROR_CLASSES}>
            <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
            {t('wizard.issue.scrollToField.symptom')}
          </div>
        )}

        <div>
          <label htmlFor="issue-description" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('wizard.issue.describe')}
          </label>
          <Textarea
            id="issue-description"
            autosize
            minRows={3}
            maxRows={8}
            classNames={{
              input: `rounded-xl border ${
                invalid ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
              } text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-customgreen-500 focus:ring-2 focus:ring-customgreen-500`,
            }}
            placeholder={t('wizard.issue.descriptionPlaceholder')}
            value={issueDescription}
            onChange={(e) => dispatch(setIssueDescription(e.target.value))}
          />
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('wizard.issue.orPick')}
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {issueCategories.map((category) => {
              const single = category.issues.length === 1;
              const selected = single
                ? issues.includes(category.issues[0].key)
                : openZones.includes(category.key);
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggleZone(category)}
                  aria-pressed={single ? selected : undefined}
                  aria-expanded={single ? undefined : selected}
                  className={chipClasses(selected)}
                >
                  <span className={`material-symbols-outlined text-base ${selected ? "text-customgreen-500" : category.color}`}>
                    {category.icon}
                  </span>
                  {zoneLabel(category)}
                  {single ? (
                    selected && <span className="material-symbols-outlined text-sm text-customgreen-500">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-base text-gray-400">
                      {selected ? "expand_less" : "expand_more"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {issueCategories
          .filter((category) => category.issues.length > 1 && openZones.includes(category.key))
          .map((category) => (
            <div key={category.key}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1 ${category.color}`}>
                <span className="material-symbols-outlined text-sm">{category.icon}</span>
                {zoneLabel(category)}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {category.issues.map((issue) => {
                  const selected = issues.includes(issue.key);
                  return (
                    <button
                      key={issue.key}
                      type="button"
                      onClick={() => toggleIssue(issue.key)}
                      aria-pressed={selected}
                      className={chipClasses(selected)}
                    >
                      <span className={`material-symbols-outlined text-base ${selected ? "text-customgreen-500" : "text-gray-400"}`}>
                        {issue.icon}
                      </span>
                      {t(`wizard.issue.issues.${issue.key}`, { defaultValue: issue.label })}
                      {selected && (
                        <span className="material-symbols-outlined text-sm text-customgreen-500">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* ── Bloc 2: Severity, unless a symptom already answered it ───────── */}
      {problemGiven && !issues.includes(ANSWERS_SEVERITY) && (
        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
            <span className="material-symbols-outlined mr-2 text-orange-500">warning</span>
            <span>
              {t('wizard.issue.severity_hint')}{" "}
              <span className="text-sm font-normal text-gray-400 whitespace-nowrap">{t('wizard.issue.optional')}</span>
            </span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {/* A device can work despite the problem: a cracked screen, a
                weak battery. It could only answer "partially" or "not at all". */}
            <button
              type="button"
              // Optional: a second tap takes the answer back.
              onClick={() => dispatch(setIssueSeverity(issueSeverity === "working" ? undefined : "working"))}
              aria-pressed={issueSeverity === "working"}
              className={`flex-1 flex items-center gap-3 p-3 sm:p-4 rounded-xl border text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-customgreen-500 ${
                issueSeverity === "working"
                  ? "border-customgreen-500 bg-customgreen-50  text-gray-900 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-customgreen-300"
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${issueSeverity === "working" ? "text-customgreen-500" : "text-gray-400"}`}>
                check_circle
              </span>
              {t('wizard.issue.stillWorks')}
            </button>

            <button
              type="button"
              onClick={() => dispatch(setIssueSeverity(issueSeverity === "partial" ? undefined : "partial"))}
              aria-pressed={issueSeverity === "partial"}
              className={`flex-1 flex items-center gap-3 p-3 sm:p-4 rounded-xl border text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-customgreen-500 ${
                issueSeverity === "partial"
                  ? "border-yellow-400 bg-yellow-50  text-gray-900 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-yellow-300"
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${issueSeverity === "partial" ? "text-yellow-500" : "text-gray-400"}`}>
                warning_amber
              </span>
              {t('wizard.issue.stillWorksPartially')}
            </button>

            <button
              type="button"
              onClick={() => dispatch(setIssueSeverity(issueSeverity === "broken" ? undefined : "broken"))}
              aria-pressed={issueSeverity === "broken"}
              className={`flex-1 flex items-center gap-3 p-3 sm:p-4 rounded-xl border text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-customgreen-500 ${
                issueSeverity === "broken"
                  ? "border-red-400 bg-red-50  text-gray-900 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-red-300"
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${issueSeverity === "broken" ? "text-red-500" : "text-gray-400"}`}>
                cancel
              </span>
              {t('wizard.issue.notWorking')}
            </button>
          </div>
        </div>
      )}

      {/* ── Bloc 3: Duration (optional) ───────────────────────────────── */}
      {problemGiven && (
        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
            <span className="material-symbols-outlined mr-2 text-blue-500">schedule</span>
            <span>
              {t('wizard.issue.duration')}{" "}
              <span className="text-sm font-normal text-gray-400 whitespace-nowrap">{t('wizard.issue.optional')}</span>
            </span>
          </h3>
          <Select
            placeholder={t('wizard.issue.selectDuration')}
            value={issueDuration ?? null}
            onChange={(val) => dispatch(setIssueDuration(val ?? undefined))}
            data={ISSUE_DURATION_OPTIONS.map((o) => ({ value: o.value, label: t(`wizard.issue.durationOptions.${o.value}`, { defaultValue: o.label }) }))}
            clearable
            classNames={{
              input:
                "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-customgreen-500 focus:ring-customgreen-500",
            }}
          />
        </div>
      )}
    </div>
  );
}
