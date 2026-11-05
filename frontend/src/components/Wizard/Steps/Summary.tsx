import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Modal, TextInput, Button } from '@mantine/core';
import { RootState } from '../../../stores/globalStore';
import { WizardImpactDisplay } from '../WizardImpactDisplay';
import { setGlobalDevice } from '../../../stores/deviceSlice';
import { startNewJourney } from '../../../utils/journeySession';
import { useWizardBack } from '../useWizardBack';
import { useHistory } from 'react-router-dom';
import { getIssueLabel } from '../../../utils/issueMapping';
import { useIssueTagPrediction } from '../../../hooks/useIssueTagPrediction';
import { useRecordRepairJourney } from '../../../hooks/useRecordRepairJourney';
import { useNearbyReuse } from '../../../hooks/useNearbyReuse';
import JourneyAccountPrompt from '../../RepairDeclaration/JourneyAccountPrompt';
import JourneyDevicePrompt from '../../RepairDeclaration/JourneyDevicePrompt';
import { getIssueTagInfo } from '../../../utils/issueTagMapping';
import { componentsForIssues } from '../../../utils/tutorialComponents';
import { searchCategory } from '../../../utils/tutorialsPath';
import { deviceService } from '../../../services/deviceService';
import { tutorialSubscriptionService } from '../../../services/tutorialSubscriptionService';
import { useSurvey } from '../../../context/SurveyContext';

const VISUAL_CONDITION_KEYS: Record<string, string> = {
  as_new: 'wizard.condition.visualAsNew',
  good: 'wizard.condition.visualGood',
  fair: 'wizard.condition.visualFair',
  poor: 'wizard.condition.visualPoor',
};

const USAGE_INTENSITY_KEYS: Record<string, string> = {
  hardly_used: 'wizard.condition.usageHardlyUsed',
  light: 'wizard.condition.usageLight',
  moderate: 'wizard.condition.usageModerate',
  heavy: 'wizard.condition.usageHeavy',
};

const DURATION_KEYS: Record<string, string> = {
  just_happened: 'wizard.issue.durationOptions.just_happened',
  less_than_week: 'wizard.issue.durationOptions.less_than_week',
  one_week_to_month: 'wizard.issue.durationOptions.one_week_to_month',
  one_to_six_months: 'wizard.issue.durationOptions.one_to_six_months',
  more_than_six_months: 'wizard.issue.durationOptions.more_than_six_months',
};

const Summary: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const { triggerSurvey } = useSurvey();
  // Asked once the user acts on the answer: two seconds after it appeared,
  // the popup covered the answer itself.
  const askOpinion = () => triggerSurvey('wizard_completion');
  const authUser = useSelector((state: RootState) => state.auth.user);
  const {
    wizardDevice: device,
    issues,
    issueSeverity,
    issueDuration,
    issueDescription,
    dispatchChoice,
    selectedDeviceType,
    productCondition,
    repairContext,
  } = useSelector((state: RootState) => state.repairWorkflow);

  const { prediction: issuePrediction, settled: predictionSettled } =
    useIssueTagPrediction(
      device?.brand,
      device?.model,
      issueDescription,
      issues,
    );

  // Records the journey once, so its outcome can be asked about on a later
  // visit. Waits for the tag so the journey is not stored without it.
  useRecordRepairJourney(issuePrediction?.label, predictionSettled);
  // Without one nearby, the map would open empty: advice instead.
  const { nearby: nearbyReuse } = useNearbyReuse(dispatchChoice === 'reuse');
  const [tutorialCount, setTutorialCount] = useState<number | null>(null);
  const [isTutorialsLoading, setIsTutorialsLoading] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (authUser?.email) setNotifyEmail(authUser.email);
  }, [authUser]);

  // Only relevant when the user chose "do it yourself": check whether tutorials
  // actually exist so we don't send them to an empty tutorials page.
  useEffect(() => {
    if (dispatchChoice !== 'doItYourself') return;
    const query = device?.model || selectedDeviceType || '';
    if (!query) {
      setTutorialCount(0);
      return;
    }
    let cancelled = false;
    setIsTutorialsLoading(true);
    deviceService
      .searchIfixit(
        query,
        '',
        '',
        '',
        device?.brand,
        searchCategory(device?.categories) || selectedDeviceType,
        device?.categories?.[0]?.ifixit_wikiid ?? undefined,
      )
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        const results = data.results || data;
        setTutorialCount(results.length);
      })
      .catch(() => { if (!cancelled) setTutorialCount(null); })
      .finally(() => { if (!cancelled) setIsTutorialsLoading(false); });
    return () => { cancelled = true; };
  }, [dispatchChoice, device, selectedDeviceType]);

  const handleSubscribeToTutorialNotification = async () => {
    if (!notifyEmail) return;
    setNotifyStatus('loading');
    try {
      await tutorialSubscriptionService.subscribe({
        email: notifyEmail,
        deviceId: device?.device_id ? String(device.device_id) : undefined,
        modelId: device?.model_id ?? undefined,
        issueTypes: issues,
        locale: i18n.language,
      });
      setNotifyStatus('success');
    } catch (err) {
      console.error('Error subscribing to tutorial notification:', err);
      setNotifyStatus('error');
    }
  };

  // The wizard shows its first step once cleared: leaving for the dashboard
  // made "Recommencer" land somewhere else than a new journey.
  const handleRestartWorkflow = () => {
    askOpinion();
    startNewJourney(dispatch);
  };

  const handlePrevious = useWizardBack();

  const noTutorialsAvailable = dispatchChoice === 'doItYourself' && tutorialCount === 0 && !isTutorialsLoading;

  const handleContinue = () => {
    if (noTutorialsAvailable) return;
    askOpinion();
    if (device?.model) {
      dispatch(setGlobalDevice(device));
      // The tutorials page puts the guides about the diagnosed part first.
      const components = componentsForIssues(issues, issuePrediction?.label);
      const query = components.length ? `?component=${components.join(',')}` : '';
      history.push(`/app/ifixit-tutorials/${device.model}${query}`);
    } else {
      history.push('/app/ifixit-tutorials');
    }
  };

  const handleGoToRepairMap = () => {
    askOpinion();
    if (device) {
      dispatch(setGlobalDevice(device));
    }
  };

  const dispatchLabel =
    dispatchChoice === 'doItYourself'
      ? t('wizard.dispatch.diyTitle')
      : dispatchChoice === 'getHelp'
      ? t('wizard.dispatch.getHelpTitle')
      : dispatchChoice === 'reuse'
      ? t('wizard.dispatch.reuseTitle')
      : dispatchChoice === 'recycle'
      ? t('wizard.dispatch.recycleTitle')
      : 'N/A';

  const dispatchIcon =
    dispatchChoice === 'doItYourself' ? 'build' : dispatchChoice === 'getHelp' ? 'engineering' : dispatchChoice === 'reuse' ? 'volunteer_activism' : dispatchChoice === 'recycle' ? 'recycling' : 'help';

  // Shared list of exits offered next to the outcome, colored with each destination's
  // own tool-identity hue so it reads at a glance rather than as one undifferentiated block.
  const OtherOptions = ({ include }: { include: Array<'repairer' | 'spareParts' | 'community'> }) => (
    <div className="space-y-2 pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {t('wizard.dispatch.alternatives.title')}
      </p>
      {include.includes('repairer') && (
        <Link
          to="/app/repair-map?type=repairer"
          onClick={handleGoToRepairMap}
          className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
        >
          <span className="material-symbols-outlined text-base">map</span>
          {t('wizard.dispatch.alternatives.repairer')}
        </Link>
      )}
      {include.includes('spareParts') && (
        <Link
          to="/app/spare-parts"
          onClick={askOpinion}
          className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
        >
          <span className="material-symbols-outlined text-base">build_circle</span>
          {t('wizard.dispatch.alternatives.spareParts')}
        </Link>
      )}
      {include.includes('community') && (
        <Link
          to="/app/api-catalog"
          onClick={askOpinion}
          className="flex items-center gap-2 text-sm font-medium text-customgreen-600 dark:text-customgreen-400 hover:underline"
        >
          <span className="material-symbols-outlined text-base">groups</span>
          {t('wizard.dispatch.alternatives.community')}
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-8">

      {/* What to do next: the one thing this screen must resolve to, visible without scrolling */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
          <span className="material-symbols-outlined text-base text-customgreen-500">{dispatchIcon}</span>
          {t('summary.yourChoice')}
        </h3>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{dispatchLabel}</p>

        {noTutorialsAvailable && (
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-gray-400">info</span>
              {t('wizard.dispatch.noTutorials')}
            </p>
            <OtherOptions include={['repairer', 'spareParts', 'community']} />
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold text-customgreen-700 dark:text-customgreen-300 hover:underline mt-3"
            >
              <span className="material-symbols-outlined text-base">notifications</span>
              {t('wizard.dispatch.notifyMe.button')}
            </button>
          </div>
        )}

        {dispatchChoice === 'doItYourself' && !noTutorialsAvailable && (
          <div>
            <button
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
              {t('summary.continue')}
            </button>
            <OtherOptions include={['repairer', 'spareParts', 'community']} />
          </div>
        )}

        {dispatchChoice === 'getHelp' && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('wizard.dispatch.conclusion.getHelp.text')}
            </p>
            <Link
              to="/app/repair-map?type=repairer"
              onClick={handleGoToRepairMap}
              className="inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              {t('wizard.dispatch.conclusion.getHelp.cta')}
            </Link>
            <OtherOptions include={['spareParts', 'community']} />
          </div>
        )}

        {dispatchChoice === 'reuse' && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('wizard.dispatch.conclusion.reuse.text')}
            </p>
            {nearbyReuse?.count ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  to="/app/repair-map?type=reuse"
                  onClick={handleGoToRepairMap}
                  className="inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">map</span>
                  {t('wizard.dispatch.conclusion.reuse.cta')}
                </Link>
                <Link
                  to="/app/reuse-info"
                  onClick={askOpinion}
                  className="text-sm font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
                >
                  {t('wizard.dispatch.reuseAdvice')}
                </Link>
              </div>
            ) : (
              <Link
                to="/app/reuse-info"
                onClick={askOpinion}
                className="inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">volunteer_activism</span>
                {t('wizard.dispatch.reuseAdvice')}
              </Link>
            )}
            <OtherOptions include={['repairer', 'spareParts']} />
          </div>
        )}

        {dispatchChoice === 'recycle' && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('wizard.dispatch.conclusion.recycle.text')}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                to="/app/recycle-info"
                onClick={askOpinion}
                className="inline-flex items-center gap-2 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">recycling</span>
                {t('wizard.dispatch.conclusion.recycle.cta')}
              </Link>
              <Link
                to="/app/repair-map?type=recycler"
                onClick={handleGoToRepairMap}
                className="text-sm font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
              >
                {t('wizard.dispatch.conclusion.recycle.map')}
              </Link>
            </div>
            <OtherOptions include={['repairer', 'spareParts']} />
          </div>
        )}
      </div>

      {/* Sits below the recommendation, never in front of it: the user came for
          an answer, not for an account. */}
      <JourneyAccountPrompt />
      <JourneyDevicePrompt />

      {device && <WizardImpactDisplay device={device} />}

      {/* What we gathered: on demand, so it doesn't compete with the recommendation above */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-500">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="w-full flex items-center justify-between gap-2 p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          {t('summary.repairDetails')}
          <span className={`material-symbols-outlined text-base transition-transform ${showDetails ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">

          <div className="flex items-start p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 mr-3 text-2xl mt-1">devices</span>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('summary.device')}</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                {device ? `${device.brand} ${device.model}` : selectedDeviceType}
              </p>
            </div>
          </div>

          <div className="flex items-start p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 mr-3 text-2xl mt-1">bug_report</span>
            <div className="min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('summary.issuesReported')}</p>
              {issues.length > 0 ? (
                <ul className="space-y-1">
                  {issues.map((key) => (
                    <li key={key} className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 flex-shrink-0" />
                      {t(`wizard.issue.issues.${key}`, { defaultValue: getIssueLabel(key) })}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-800 dark:text-white font-semibold">—</p>
              )}
              {(issueSeverity || issueDuration) && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  {issueSeverity && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('summary.severity')}:{' '}
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {issueSeverity === 'broken'
                          ? t('wizard.issue.notWorking')
                          : issueSeverity === 'working'
                            ? t('summary.working')
                            : t('wizard.issue.stillWorksPartially')}
                      </span>
                    </p>
                  )}
                  {issueDuration && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('summary.duration')}:{' '}
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {DURATION_KEYS[issueDuration] ? t(DURATION_KEYS[issueDuration]) : issueDuration}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {issueDescription && (
            <div className="flex items-start p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mr-3 text-2xl mt-1">notes</span>
              <div className="min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('summary.description')}</p>
                <p className="text-sm text-gray-800 dark:text-white">{issueDescription}</p>
              </div>
            </div>
          )}

          {issuePrediction && (() => {
            const info = getIssueTagInfo(issuePrediction.label);
            return (
              <div className="flex items-start p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
                <span className="material-symbols-outlined text-customgreen-500 mr-3 text-2xl mt-1">search_insights</span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('summary.detectedIssueOrigin')}</p>
                  {repairContext === 'repairer' ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${info.badgeClasses}`}>
                      <span className="material-symbols-outlined text-xs">{info.icon}</span>
                      {t(info.displayKey)}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-800 dark:text-white">{t(info.sentenceKey)}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {productCondition && (
            <div className="flex items-start p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 mr-3 text-2xl mt-1">device_unknown</span>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('summary.deviceCondition')}</p>
                {productCondition.estimatedAge !== undefined && productCondition.estimatedAge > 0 && (
                  <p className="text-sm text-gray-800 dark:text-white">
                    {t('summary.age')}: <span className="font-semibold">{productCondition.estimatedAge} {productCondition.estimatedAge === 1 ? t('wizard.condition.year') : t('wizard.condition.years')}</span>
                  </p>
                )}
                {productCondition.visualCondition && (
                  <p className="text-sm text-gray-800 dark:text-white">
                    {t('summary.visual')}: <span className="font-semibold">{VISUAL_CONDITION_KEYS[productCondition.visualCondition] ? t(VISUAL_CONDITION_KEYS[productCondition.visualCondition]) : productCondition.visualCondition}</span>
                  </p>
                )}
                {productCondition.usageIntensity && (
                  <p className="text-sm text-gray-800 dark:text-white">
                    {t('summary.usage')}: <span className="font-semibold">{USAGE_INTENSITY_KEYS[productCondition.usageIntensity] ? t(USAGE_INTENSITY_KEYS[productCondition.usageIntensity]) : productCondition.usageIntensity}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* German's "Workflow neu starten" plus an icon doesn't fit next to
          "Précédent" in an unwrapped row at mobile widths — same fix as
          Wizard.tsx and RepairRecordWizard.tsx, minus the reordering: this
          pair has no clear "primary forward" action to promote, so they
          keep their natural order when stacked. */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center pt-2">
        <button
          onClick={handlePrevious}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 py-3 px-6 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 transition-colors w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {t('wizard.previous')}
        </button>
        <button
          onClick={handleRestartWorkflow}
          className="inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 rounded-full transition-colors w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          {t('summary.restartWorkflow')}
        </button>
      </div>

      <Modal
        opened={isNotifyModalOpen}
        onClose={() => {
          setIsNotifyModalOpen(false);
          setNotifyStatus('idle');
        }}
        title={t('wizard.dispatch.notifyMe.button')}
      >
        {notifyStatus === 'success' ? (
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
            {notifyStatus === 'error' && (
              <p className="text-sm text-red-500">{t('wizard.dispatch.notifyMe.error')}</p>
            )}
            <Button
              fullWidth
              color="customgreen"
              loading={notifyStatus === 'loading'}
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
};

export default Summary;
