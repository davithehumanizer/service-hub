import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch } from "../../stores/globalStore";
import { nextStep, setStep, setRepairContext, triggerIssueValidation, triggerConditionValidation } from "../../stores/repairWorkflowSlice";
import { useWizardBack } from "./useWizardBack";
import DeviceSearch from "./Steps/DeviceSearch";
import IssueSelection from "./Steps/IssueSelection";
import ProductCondition from "./Steps/ProductCondition";
import Dispatch from "./Steps/Dispatch";
import WizardImpactDisplayCompact from "./WizardImpactDisplayCompact";
import { ActionIcon, Button, Popover, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { selectUserType } from "../../stores/authSlice";
import { isJourneyCurrent, markJourneyCurrent, startNewJourney } from "../../utils/journeySession";

import Summary from "./Steps/Summary";

export default function Wizard() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const activeStep = useSelector((state: RootState) => state.repairWorkflow.step);
  const allowNextStep = useSelector((state: RootState) => state.repairWorkflow.allowNextStep);
  const hideStepNav = useSelector((state: RootState) => state.repairWorkflow.hideStepNav);
  const maxStep = useSelector((state: RootState) => state.repairWorkflow.maxStep);
  const repairContext = useSelector((state: RootState) => state.repairWorkflow.repairContext);
  const {wizardDevice : device, selectedDeviceType, dispatchChoice, ecoData} = useSelector((state: RootState) => state.repairWorkflow);
  const userType = useSelector(selectUserType);
  const phone = useMediaQuery('(max-width: 639px)', false);
  const history = useHistory();
  const location = useLocation();

  // Sync repairContext with userType on mount
  useEffect(() => {
    if (userType === 'repairer') {
      dispatch(setRepairContext('repairer'));
    } else {
      dispatch(setRepairContext('customer'));
    }
  }, [userType, dispatch]);

  const isRepairer = repairContext === 'repairer';

  const steps = [
    { 
      title: isRepairer ? t('wizard.steps.deviceQuestionRepairer') : t('wizard.steps.deviceQuestion'), 
      stepProgressTitle: t('wizard.steps.device'),
      icon: "devices",
      component: <DeviceSearch showDeviceDetailButton={false} /> 
    },
    { 
      title: isRepairer ? t('wizard.steps.issueQuestionRepairer') : t('wizard.steps.issueQuestion'), 
      stepProgressTitle: t('wizard.steps.issue'),
      icon: "bug_report",
      component: <IssueSelection /> 
    },
    { 
      title: t('wizard.steps.conditionTitle'), 
      stepProgressTitle: t('wizard.steps.condition'),
      icon: "device_unknown",
      component: <ProductCondition /> 
    },
    { 
      title: isRepairer ? t('wizard.steps.solutionTitleRepairer') : t('wizard.steps.solutionTitle'), 
      stepProgressTitle: t('wizard.steps.solution'),
      icon: "build",
      component: <Dispatch /> 
    },
    { 
      title: isRepairer ? t('wizard.steps.summaryTitleRepairer') : t('wizard.steps.summaryTitle'), 
      stepProgressTitle: t('wizard.steps.summary'),
      icon: "summarize",
      component: <Summary /> 
    },
  ];

  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;
  const ISSUE_STEP_INDEX = 1;
  const CONDITION_STEP_INDEX = 2;
  const isIssueStep = activeStep === ISSUE_STEP_INDEX;
  const isConditionStep = activeStep === CONDITION_STEP_INDEX;

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  // Each step is an entry in the browser's history (?step=2), so Back, the
  // browser's or a phone's, returns to the previous step instead of leaving
  // the wizard (PBI 13839). The URL follows the store, never the reverse on
  // arrival: an old ?step= in a link must not jump past the steps answered.
  const urlStep = Number(new URLSearchParams(location.search).get('step')) - 1;
  const arrived = useRef(false);
  const stepUrl = (step: number) => {
    const params = new URLSearchParams(location.search);
    params.set('step', String(step + 1));
    return { search: `?${params}` };
  };
  useEffect(() => {
    if (!arrived.current || urlStep === activeStep) return;
    if (urlStep >= 0 && urlStep <= maxStep) dispatch(setStep(urlStep));
    else history.replace(stepUrl(activeStep));
  }, [location.search]);
  const lastStep = useRef(activeStep);
  useEffect(() => {
    if (urlStep !== activeStep) {
      const to = { ...stepUrl(activeStep), state: { fromStep: lastStep.current } };
      if (arrived.current) history.push(to);
      else history.replace(to);
    }
    lastStep.current = activeStep;
    arrived.current = true;
  }, [activeStep]);

  // On narrow screens the step indicator row scrolls horizontally (see
  // overflow-x-auto below); keep the active step in view when it changes,
  // otherwise landing on step 4-5 could show a row scrolled to steps 1-3.
  const stepIndicatorRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    stepIndicatorRefs.current[activeStep]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeStep]);

  const handleNext = () => {
    if (isLastStep) return;
    if (!allowNextStep) {
      // On the issue/condition steps, keep the button active and give
      // feedback instead of silently disabling it.
      if (isIssueStep) dispatch(triggerIssueValidation());
      if (isConditionStep) dispatch(triggerConditionValidation());
      return;
    }
    dispatch(nextStep());
  };

  const handlePrev = useWizardBack();

  // A journey from an earlier visit is offered to resume or replace; one
  // started in this session just resumes (PBI 13840).
  const hasProgress = !!device || !!selectedDeviceType || activeStep > 0;
  // A category picked, and nothing else, is not worth a question.
  const [askResume, setAskResume] = useState(() => (!!device || activeStep > 0) && !isJourneyCurrent());
  const [confirmNew, setConfirmNew] = useState(false);
  useEffect(() => {
    if (!askResume) markJourneyCurrent();
  }, [askResume]);
  const startOver = () => {
    setConfirmNew(false);
    setAskResume(false);
    startNewJourney(dispatch);
  };
  // Not selectedDeviceType: it holds a category's untranslated name.
  const deviceLabel = device
    ? [device.brand, device.model].filter(Boolean).join(' ')
    : t('wizard.resume.someDevice');

  // Always within reach while a journey is under way, behind a confirmation:
  // a stray tap would otherwise wipe every answer.
  const newJourneyButton = hasProgress && !askResume && (
    <Popover opened={confirmNew} onChange={setConfirmNew} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        {phone ? (
          <ActionIcon variant="subtle" color="gray" aria-label={t('wizard.resume.startOver')} onClick={() => setConfirmNew((o) => !o)}>
            <span className="material-symbols-outlined text-lg">restart_alt</span>
          </ActionIcon>
        ) : (
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<span className="material-symbols-outlined text-base">restart_alt</span>}
            onClick={() => setConfirmNew((o) => !o)}
          >
            {t('wizard.resume.startOver')}
          </Button>
        )}
      </Popover.Target>
      <Popover.Dropdown>
        {/* Mantine's colours, not Tailwind's dark: the dropdown follows
            Mantine's scheme, which may not be the page's. */}
        <Text size="sm" mb="sm" maw={280} tt="none" fw={400} style={{ letterSpacing: 'normal' }}>
          {t('wizard.resume.confirm')}
        </Text>
        <div className="flex gap-2 justify-end">
          <Button size="xs" variant="default" onClick={() => setConfirmNew(false)}>{t('common.cancel')}</Button>
          <Button size="xs" color="red" onClick={startOver}>{t('wizard.resume.confirmYes')}</Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  );

  const progress = ((activeStep + 1) / steps.length) * 100;
  const stepCounter = (
    <>
      <span aria-hidden="true">{activeStep + 1}/{steps.length}</span>
      <span className="sr-only">{t('wizard.step', { current: activeStep + 1, total: steps.length })}</span>
    </>
  );
  const progressBar = (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-customgreen-400 to-customgreen-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

  useEffect(() => {
    if(!device && !selectedDeviceType && !isFirstStep){
      //set active step to 0
      dispatch(setStep(0));
    }
  }, [device, selectedDeviceType, isFirstStep, dispatch]);

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full pt-4 sm:pt-10 pb-10">
      <div className="w-full sm:space-y-8">
        {/* Progress Header — on a phone it moves into the step's card, below. */}
        <div className="hidden sm:block bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="material-symbols-outlined text-2xl text-customgreen-600 dark:text-customgreen-400">
                {steps[activeStep].icon}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('wizard.title')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {!phone && newJourneyButton}
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stepCounter}
              </p>
            </div>
          </div>

          {progressBar}

          {/* Step Indicators — the circles + labels repeat what "Étape X sur Y"
              above already says, and on narrow screens five labelled circles
              don't fit without forcing a horizontal scroll to reach the last
              one. Shown from sm: up only; the progress bar and step counter
              text keep mobile users oriented without it. */}
          <div className="relative mt-6 hidden sm:block">
            <div className="flex justify-between items-center gap-2">
              {steps.map((step, index) => {
                // A step is clickable if it was already reached in the session (index <= maxStep)
                // or it's the immediate next step when allowNextStep is true
                const isReached = index <= maxStep;
                const isNextAllowed = index === activeStep + 1 && allowNextStep;
                const isClickable = isReached || isNextAllowed;

                return (
                  <div
                    key={index}
                    ref={(el) => { stepIndicatorRefs.current[index] = el; }}
                    className="flex flex-col items-center relative z-10"
                  >
                    <button
                      type="button"
                      onClick={() => isClickable && dispatch(setStep(index))}
                      aria-disabled={!isClickable}
                      className="focus:outline-none"
                      title={isClickable ? t('wizard.goToStep', { step: index + 1 }) : t('wizard.stepNotAvailable')}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                        isReached
                          ? 'bg-customgreen-500 text-white shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      } ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'}`}>
                        {index < activeStep ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          index + 1
                        )}
                      </div>
                    </button>

                    <span className={`text-xs mt-2 text-center font-medium whitespace-nowrap ${
                      index === activeStep
                        ? 'text-customgreen-600 dark:text-customgreen-400'
                        : 'text-gray-400 dark:text-gray-500'
                    } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isClickable && dispatch(setStep(index))}
                    >
                      {step.stepProgressTitle}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
              <div 
                className="h-full bg-customgreen-500 transition-all duration-500 ease-out"
                style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-2xl shadow-lg">
          <div className="sm:hidden mb-4">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <h1>{t('wizard.title')}</h1>
              <div className="flex items-center gap-1">
                {phone && newJourneyButton}
                <p>{stepCounter}</p>
              </div>
            </div>
            {progressBar}
          </div>
          {askResume ? (
            <div className="text-center py-6 sm:py-10 max-w-md mx-auto">
              <span className="material-symbols-outlined text-5xl text-customgreen-600 dark:text-customgreen-400">history</span>
              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.resume.title')}</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('wizard.resume.text', { device: deviceLabel, step: activeStep + 1, total: steps.length })}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Button color="customgreen" radius="xl" size="md" onClick={() => setAskResume(false)}>
                  {t('wizard.resume.continue')}
                </Button>
                <Button
                  variant="default"
                  radius="xl"
                  size="md"
                  leftSection={<span className="material-symbols-outlined text-base">restart_alt</span>}
                  onClick={startOver}
                >
                  {t('wizard.resume.startOver')}
                </Button>
              </div>
            </div>
          ) : (<>
          <div className={`flex items-center justify-center ${isLastStep ? '' : 'mb-4 sm:mb-8'}`}>
            {/* The wrapper hides it: the icon font's own display would beat `hidden`. */}
            <span className="hidden sm:inline-flex mr-4">
              <span className="material-symbols-outlined text-4xl text-customgreen-600 dark:text-customgreen-400">
                {steps[activeStep].icon}
              </span>
            </span>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
              {steps[activeStep].title}
            </h2>
          </div>
          <div className="mt-4 sm:mt-8">{steps[activeStep].component}</div>

          {/* Sticky Navigation Footer - hidden on the last step (Summary has its own nav buttons)
              and on any sub-screen that asked to hide it (e.g. device search's method picker,
              which has nothing to go back to and nothing ready to move forward to yet) */}
          {!isLastStep && !hideStepNav && (
            <div className="sticky bottom-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-80 backdrop-filter backdrop-blur-md py-3 sm:py-4 px-4 sm:px-8 -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 mt-4 sm:mt-8 border-t border-gray-100 dark:border-gray-700 z-30 shadow-top rounded-b-2xl">
              {/* One row at every width. On a 360px phone the full labels are cut
                  even at size="md", German first: there it reads "Retour" /
                  "Suivant", with less padding. Nothing to go back to on step 1. */}
              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <Button
                      onClick={handlePrev}
                      variant="subtle"
                      color="gray"
                      size={phone ? "md" : "lg"}
                      px={phone ? 10 : undefined}
                      radius="xl"
                      className="font-bold"
                      leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
                  >
                      {phone ? t('common.back') : t('wizard.previous')}
                  </Button>
                )}
                 {/* Impact Display - Integrated */}
              {/* {(device || selectedDeviceType) && (
                <div>
                  <WizardImpactDisplayCompact
                    device={device}
                    dispatchChoice={dispatchChoice}
                    ecoData={ecoData}
                    selectedDeviceType={selectedDeviceType}
                  />
                </div>
              )} */}
                <Button
                    onClick={handleNext}
                    disabled={isLastStep || (!isIssueStep && !isConditionStep && !allowNextStep)}
                    variant="filled"
                    color="customgreen"
                    size={phone ? "md" : "lg"}
                    px={phone ? 14 : undefined}
                    radius="xl"
                    className="font-bold shadow-md hover:shadow-lg transition-all flex-1 sm:flex-none sm:ml-auto"
                    rightSection={phone ? undefined : <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                >
                    {phone ? t('wizard.next') : t('wizard.nextStep')}
                </Button>
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}