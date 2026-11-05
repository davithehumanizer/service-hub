import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { repairMonitorService, CreateRepairRecordPayload } from '../../../services/repairMonitorService';
import Step1ItemDetails from './Step1ItemDetails';
import Step2RepairDetails from './Step2RepairDetails';
import Step3RepairOutcome from './Step3RepairOutcome';

interface Props {
  onSuccess?: () => void;
  onGoToDashboard?: () => void;
}

const RepairRecordWizard: React.FC<Props> = ({ onSuccess, onGoToDashboard }) => {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const STEPS = [
    { title: t('repairMonitor.wizard.steps.device'), stepTitle: t('repairMonitor.wizard.steps.deviceTitle'), icon: 'devices' },
    { title: t('repairMonitor.wizard.steps.repair'), stepTitle: t('repairMonitor.wizard.steps.repairTitle'), icon: 'build' },
    { title: t('repairMonitor.wizard.steps.outcome'), stepTitle: t('repairMonitor.wizard.steps.outcomeTitle'), icon: 'task_alt' },
  ];
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (updates: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  // Per-step validation — must be satisfied to proceed
  const canProceed = (): boolean => {
    if (step === 0) {
      // Require at least brand or modelType (manual) or a catalog selection (productCategoryId)
      return !!(formData.brand?.trim() || formData.modelType?.trim() || formData.productCategoryId);
    }
    return true;
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await repairMonitorService.createRecord(formData as CreateRepairRecordPayload);
      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFormData({});
    setSubmitted(false);
    setError(null);
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  // On narrow screens the step indicator row scrolls horizontally (see
  // overflow-x-auto below); keep the active step in view when it changes.
  const stepIndicatorRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    stepIndicatorRefs.current[step]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [step]);

  if (submitted) {
    return (
      <div className="w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg flex flex-col items-center gap-5 py-16">
          <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-teal-600 dark:text-teal-400">check_circle</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('repairMonitor.wizard.successTitle')}</h3>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            <Button
              color="teal"
              size="lg"
              radius="xl"
              onClick={onGoToDashboard}
              leftSection={<span className="material-symbols-outlined text-sm">monitoring</span>}
            >
              {t('repairMonitor.wizard.viewDashboard')}
            </Button>
            <Button
              variant="outline"
              color="teal"
              size="lg"
              radius="xl"
              onClick={handleReset}
              leftSection={<span className="material-symbols-outlined text-sm">add_circle</span>}
            >
              {t('repairMonitor.wizard.submitAnother')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Progress header — mirrors Wizard.tsx */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-2xl text-teal-600 dark:text-teal-400">
              {STEPS[step].icon}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('repairMonitor.wizard.title')}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('repairMonitor.wizard.stepOf', { current: step + 1, total: STEPS.length })}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('repairMonitor.wizard.complete', { progress: Math.round(progress) })}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-teal-400 to-teal-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators — hidden on mobile: labelled circles for every
            step don't fit without forcing a horizontal scroll to reach the
            last one, and "stepOf"/the progress bar above already say where
            the user is. See Wizard.tsx for the same fix. */}
        <div className="relative mt-6 hidden sm:block">
          <div className="flex justify-between items-center gap-2">
            {STEPS.map((s, index) => (
              <div
                key={index}
                ref={(el) => { stepIndicatorRefs.current[index] = el; }}
                className="flex flex-col items-center relative z-10"
              >
                <button
                  type="button"
                  onClick={() => index <= step && setStep(index)}
                  className="focus:outline-none"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    index <= step
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  } ${index <= step ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'}`}>
                    {index < step ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      index + 1
                    )}
                  </div>
                </button>
                <span className={`text-xs mt-2 text-center font-medium whitespace-nowrap ${
                  index === step
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-gray-400 dark:text-gray-500'
                } ${index <= step ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => index <= step && setStep(index)}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
          {/* Progress line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
            <div
              className="h-full bg-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-4xl text-teal-600 dark:text-teal-400 mr-4">
            {STEPS[step].icon}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
            {STEPS[step].stepTitle}
          </h2>
        </div>

        <div className="mt-6">
          {step === 0 && <Step1ItemDetails data={formData} onChange={handleChange} />}
          {step === 1 && <Step2RepairDetails data={formData} onChange={handleChange} />}
          {step === 2 && <Step3RepairOutcome data={formData} onChange={handleChange} />}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Sticky footer navigation — mirrors Wizard.tsx */}
        <div className="sticky bottom-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-80 backdrop-filter backdrop-blur-md py-4 px-8 -mx-8 -mb-8 mt-8 border-t border-gray-100 dark:border-gray-700 z-30 shadow-top rounded-b-2xl">
          {step === 0 && !canProceed() && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-3">
              <span className="material-symbols-outlined text-sm">info</span>
              {t('repairMonitor.step1.deviceRequired')}
            </p>
          )}
          {/* Two size="lg" pill buttons with icon + label don't both fit on
              one row under ~360px. Stacked and full width on mobile, with
              the primary action first — same fix as Wizard.tsx. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
            <Button
              onClick={handleBack}
              disabled={isFirstStep}
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              className="font-bold w-full sm:w-auto order-2 sm:order-1"
              leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
            >
              {t('repairMonitor.wizard.previous')}
            </Button>
            {!isLastStep ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                variant="filled"
                color="teal"
                size="lg"
                radius="xl"
                className="font-bold shadow-md hover:shadow-lg transition-all w-full sm:w-auto order-1 sm:order-2"
                rightSection={<span className="material-symbols-outlined text-sm">arrow_forward</span>}
              >
                {t('repairMonitor.wizard.next')}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={!formData.repairStatus}
                variant="filled"
                color="teal"
                size="lg"
                radius="xl"
                className="font-bold shadow-md hover:shadow-lg transition-all w-full sm:w-auto order-1 sm:order-2"
                rightSection={<span className="material-symbols-outlined text-sm">send</span>}
              >
                {t('repairMonitor.wizard.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairRecordWizard;
