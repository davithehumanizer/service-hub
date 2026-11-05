import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { RootState } from "../../../stores/globalStore";
import {
  setProductCondition,
  setHandy,
  setAllowNextStep,
  VisualCondition,
  UsageIntensity,
} from "../../../stores/repairWorkflowSlice";
import { ActionIcon, Popover, Slider } from "@mantine/core";

// The ring this replaced, pulled out by a negative margin, reached the card's
// edges on a phone.
const FIELD_ERROR_CLASSES =
  "flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300";

// ─── Option definitions ──────────────────────────────────────────────────────

const VISUAL_CONDITION_KEYS: Record<string, { labelKey: string; descKey?: string }> = {
  unknown: { labelKey: 'wizard.condition.visualUnknown' },
  as_new:  { labelKey: 'wizard.condition.visualAsNew',  descKey: 'wizard.condition.visualAsNewDesc' },
  good:    { labelKey: 'wizard.condition.visualGood',   descKey: 'wizard.condition.visualGoodDesc' },
  fair:    { labelKey: 'wizard.condition.visualFair',   descKey: 'wizard.condition.visualFairDesc' },
  poor:    { labelKey: 'wizard.condition.visualPoor',   descKey: 'wizard.condition.visualPoorDesc' },
};

const USAGE_INTENSITY_KEYS: Record<string, { labelKey: string; descKey?: string }> = {
  unknown:      { labelKey: 'wizard.condition.usageUnknown' },
  hardly_used:  { labelKey: 'wizard.condition.usageHardlyUsed',  descKey: 'wizard.condition.usageHardlyUsedDesc' },
  light:        { labelKey: 'wizard.condition.usageLight',        descKey: 'wizard.condition.usageLightDesc' },
  moderate:     { labelKey: 'wizard.condition.usageModerate',     descKey: 'wizard.condition.usageModerateDesc' },
  heavy:        { labelKey: 'wizard.condition.usageHeavy',        descKey: 'wizard.condition.usageHeavyDesc' },
};

const VISUAL_CONDITIONS: { value: VisualCondition; icon: string; color: string }[] = [
  { value: "unknown",  icon: "help_outline",       color: "text-gray-400" },
  { value: "as_new",   icon: "star",               color: "text-green-500" },
  { value: "good",     icon: "thumb_up",           color: "text-blue-500" },
  { value: "fair",     icon: "thumbs_up_down",     color: "text-yellow-500" },
  { value: "poor",     icon: "thumb_down",         color: "text-red-500" },
];

const USAGE_INTENSITIES: { value: UsageIntensity; icon: string; color: string }[] = [
  { value: "unknown",      icon: "help_outline",          color: "text-gray-400" },
  { value: "hardly_used",  icon: "battery_saver",         color: "text-green-500" },
  { value: "light",        icon: "light_mode",            color: "text-blue-400" },
  { value: "moderate",     icon: "autorenew",             color: "text-yellow-500" },
  { value: "heavy",        icon: "local_fire_department", color: "text-red-500" },
];

// What each answer means, on demand: under every option it tripled the step.
function AnswerHelp({ label, items }: { label: string; items: { title: string; desc: string }[] }) {
  return (
    <Popover width={280} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" aria-label={label} title={label} className="ml-1">
          <span className="material-symbols-outlined text-xl">info</span>
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.title}>
              <span className="font-semibold">{item.title}</span> — {item.desc}
            </li>
          ))}
        </ul>
      </Popover.Dropdown>
    </Popover>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductCondition() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { productCondition, handy, conditionValidationAttempt } = useSelector(
    (state: RootState) => state.repairWorkflow
  );

  const estimatedAge     = productCondition?.estimatedAge;
  const visualCondition  = productCondition?.visualCondition;
  const usageIntensity   = productCondition?.usageIntensity;

  const visualRef = useRef<HTMLDivElement>(null);
  const usageRef = useRef<HTMLDivElement>(null);
  const [invalidField, setInvalidField] = useState<"visual" | "usage" | null>(null);

  // Unlock "Next" when both visual condition and usage intensity are chosen
  useEffect(() => {
    dispatch(
      setAllowNextStep(
        visualCondition !== undefined && usageIntensity !== undefined
      )
    );
  }, [visualCondition, usageIntensity, dispatch]);

  // Clear the highlight as soon as the missing field gets completed
  useEffect(() => {
    if (visualCondition !== undefined && invalidField === "visual") {
      setInvalidField(null);
    }
    if (usageIntensity !== undefined && invalidField === "usage") {
      setInvalidField(null);
    }
  }, [visualCondition, usageIntensity, invalidField]);

  // Triggered by the Wizard "Next" button when the step is incomplete. Only a
  // press made here counts, as on the problem step.
  const seenAttempt = useRef(conditionValidationAttempt);
  useEffect(() => {
    if (conditionValidationAttempt === seenAttempt.current) return;
    seenAttempt.current = conditionValidationAttempt;
    if (visualCondition === undefined) {
      setInvalidField("visual");
      visualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (usageIntensity === undefined) {
      setInvalidField("usage");
      usageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [conditionValidationAttempt]);

  const update = (patch: Partial<{ estimatedAge: number; visualCondition: VisualCondition; usageIntensity: UsageIntensity }>) => {
    dispatch(
      setProductCondition({
        estimatedAge,
        visualCondition,
        usageIntensity,
        ...patch,
      })
    );
  };

  const helpItems = (
    options: { value: string }[],
    keys: Record<string, { labelKey: string; descKey?: string }>,
  ) =>
    options
      .filter((opt) => keys[opt.value]?.descKey)
      .map((opt) => ({ title: t(keys[opt.value].labelKey), desc: t(keys[opt.value].descKey!) }));

  const optionClasses = (selected: boolean) =>
    `flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-customgreen-500 ${
      selected
        ? "border-customgreen-500 bg-customgreen-50 dark:bg-white text-gray-900 shadow-sm"
        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-customgreen-400 hover:bg-gray-50 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="space-y-6 sm:space-y-10">

      {/* Testers found the condition and usage questions irrelevant once the
          problem was known: they stay required, and say what they are for. */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('wizard.condition.requiredWhy')}
      </p>

      {/* ── Estimated Age ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-6 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-blue-500">calendar_month</span>
          <span>
            {t('wizard.condition.estimatedAge')}{" "}
            <span className="text-sm font-normal text-gray-400 whitespace-nowrap">{t('wizard.issue.optional')}</span>
          </span>
        </h3>
        <div className="px-2">
          <Slider
            min={0}
            max={15}
            step={1}
            value={estimatedAge ?? 0}
            onChange={(val) => update({ estimatedAge: val })}
            marks={[
              { value: 0,  label: "0" },
              { value: 5,  label: `5 ${t('wizard.condition.yrs')}` },
              { value: 10, label: `10 ${t('wizard.condition.yrs')}` },
              { value: 15, label: `15 ${t('wizard.condition.yrs')}` },
            ]}
            label={(val) => `${val} ${val === 1 ? t('wizard.condition.year') : t('wizard.condition.years')}`}
            color="green"
            styles={{ markLabel: { fontSize: 11 } }}
          />
        </div>
        {estimatedAge !== undefined && estimatedAge > 0 && (
          <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
            {t('wizard.condition.approx')}{" "}
            <span className="font-semibold text-gray-800 dark:text-white">
              {estimatedAge} {estimatedAge === 1 ? t('wizard.condition.year') : t('wizard.condition.years')} {t('wizard.condition.old')}
            </span>
          </p>
        )}
      </div>

      {/* ── Visual Condition ──────────────────────────────────────────── */}
      <div ref={visualRef}>
        <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-orange-500">visibility</span>
          {t('wizard.condition.visual')}
          <AnswerHelp label={t('wizard.condition.answersHelp')} items={helpItems(VISUAL_CONDITIONS, VISUAL_CONDITION_KEYS)} />
        </h3>
        {invalidField === "visual" && (
          <div role="alert" className={`${FIELD_ERROR_CLASSES} mb-3`}>
            <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
            {t('wizard.condition.scrollToField.visual')}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
          {VISUAL_CONDITIONS.map((opt) => {
            const selected = visualCondition === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                // A second tap takes the answer back.
                onClick={() => update({ visualCondition: selected ? undefined : opt.value })}
                aria-pressed={selected}
                className={optionClasses(selected)}
              >
                <span className={`material-symbols-outlined text-xl flex-shrink-0 ${selected ? "text-customgreen-500" : opt.color}`}>
                  {opt.icon}
                </span>
                {/* "Befriedigend" is wider than a 320px phone's column. */}
                <span className="min-w-0 break-words">
                  {t(VISUAL_CONDITION_KEYS[opt.value]?.labelKey ?? '', { defaultValue: opt.value })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Usage Intensity ───────────────────────────────────────────── */}
      <div ref={usageRef}>
        <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-purple-500">bolt</span>
          {t('wizard.condition.usage')}
          <AnswerHelp label={t('wizard.condition.answersHelp')} items={helpItems(USAGE_INTENSITIES, USAGE_INTENSITY_KEYS)} />
        </h3>
        {invalidField === "usage" && (
          <div role="alert" className={`${FIELD_ERROR_CLASSES} mb-3`}>
            <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
            {t('wizard.condition.scrollToField.usage')}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
          {USAGE_INTENSITIES.map((opt) => {
            const selected = usageIntensity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ usageIntensity: selected ? undefined : opt.value })}
                aria-pressed={selected}
                className={optionClasses(selected)}
              >
                <span className={`material-symbols-outlined text-xl flex-shrink-0 ${selected ? "text-customgreen-500" : opt.color}`}>
                  {opt.icon}
                </span>
                <span className="min-w-0 break-words">
                  {t(USAGE_INTENSITY_KEYS[opt.value]?.labelKey ?? '', { defaultValue: opt.value })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Self-repair ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-1 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-customgreen-500">handyman</span>
          <span>
            {t('wizard.condition.handy')}{" "}
            <span className="text-sm font-normal text-gray-400 whitespace-nowrap">{t('wizard.issue.optional')}</span>
          </span>
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('wizard.condition.handyWhy')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[true, false].map((value) => {
            const selected = handy === value;
            return (
              <button
                key={String(value)}
                type="button"
                aria-pressed={selected}
                onClick={() => dispatch(setHandy(selected ? undefined : value))}
                className={`${optionClasses(selected)} justify-center`}
              >
                {value ? t('common.yes') : t('common.no')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
