import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  repairJourneyService,
  JourneyOutcome,
  REPAIR_BARRIERS,
  SOLUTION_TAGS,
} from '../../services/repairJourneyService';

/** Newest first: a device being repaired today is far more likely to be recent. */
const OLDEST_YEAR = 1980;
const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - OLDEST_YEAR + 1 },
  (_, index) => new Date().getFullYear() - index,
);

interface Props {
  journeyId: string;
  /** Held by the browser that recorded the journey. Absent when the signed-in
   *  owner is answering from somewhere else — the server accepts either. */
  declarationToken?: string;
  deviceLabel: string;
  /** Offered only where postponing means something, i.e. in the banner. */
  onSnooze?: () => void;
  /** Likewise: stops the banner asking about this journey. */
  onDismiss?: () => void;
  /** Success is reported, never rendered: the caller decides what replaces the
   *  form, and knows whether the journey still exists in its own list. */
  onDeclared: () => void;
}

/**
 * The two-step declaration: the outcome in one click, then optional detail.
 *
 * Every question after the first costs answers, so only the outcome is
 * required and the second step can be sent empty.
 */
const RepairDeclarationForm: React.FC<Props> = ({
  journeyId,
  declarationToken,
  deviceLabel,
  onSnooze,
  onDismiss,
  onDeclared,
}) => {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<JourneyOutcome | null>(null);
  const [barrier, setBarrier] = useState('');
  const [solution, setSolution] = useState('');
  const [year, setYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (!outcome) return;
    setSubmitting(true);
    try {
      await repairJourneyService.declareOutcome(journeyId, {
        declarationToken,
        outcome,
        repairBarrier: outcome === 'EndOfLife' ? barrier || undefined : undefined,
        solutionTag: outcome !== 'EndOfLife' ? solution || undefined : undefined,
        yearOfManufacture: year ? Number(year) : undefined,
      });
      onDeclared();
    } catch (error) {
      console.error('Could not declare the repair outcome:', error);
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (failed) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span className="material-symbols-outlined text-base">error</span>
        {t('declaration.failed')}
      </p>
    );
  }

  if (outcome) {
    const options = outcome === 'EndOfLife' ? REPAIR_BARRIERS : SOLUTION_TAGS;
    const setter = outcome === 'EndOfLife' ? setBarrier : setSolution;
    const value = outcome === 'EndOfLife' ? barrier : solution;
    const labelKey =
      outcome === 'EndOfLife' ? 'declaration.barrier' : 'declaration.solution';

    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t(`${labelKey}.question`)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('declaration.optional')}
        </p>
        <select
          value={value}
          onChange={(e) => setter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">{t('declaration.noAnswer')}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {t(`${labelKey}.options.${option}`)}
            </option>
          ))}
        </select>
        {/* A number spinner starts at 0 and counts up, which is useless for a
            year. A list of plausible years, newest first, is one tap instead. */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">{t('declaration.yearPlaceholder')}</option>
          {YEAR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-customgreen-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {t('declaration.send')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline"
          >
            {t('declaration.skipDetails')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
        <span className="material-symbols-outlined text-base text-customgreen-500">
          help
        </span>
        {t('declaration.question', { device: deviceLabel })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOutcome('Fixed')}
          className="px-4 py-2 rounded-lg bg-customgreen-600 text-white text-sm font-medium"
        >
          {t('declaration.answers.fixed')}
        </button>
        <button
          type="button"
          onClick={() => setOutcome('PartiallyFixed')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {t('declaration.answers.partially')}
        </button>
        <button
          type="button"
          onClick={() => setOutcome('EndOfLife')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {t('declaration.answers.notFixed')}
        </button>
        {onSnooze && (
          <button
            type="button"
            onClick={onSnooze}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            {t('declaration.answers.notYet')}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            {t('declaration.answers.dontAsk')}
          </button>
        )}
      </div>
    </div>
  );
};

export default RepairDeclarationForm;
