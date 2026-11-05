import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { RootState } from '../stores/globalStore';
import { markDeclarationDone } from '../stores/pendingDeclarationsSlice';
import {
  repairJourneyService,
  JourneySummary,
  asksForOutcome,
} from '../services/repairJourneyService';
import RepairDeclarationForm from '../components/RepairDeclaration/RepairDeclarationForm';
import { useNotification } from '../context/NotificationContext';
import { userDevicesUpdated } from '../stores/authSlice';
import { PersonalDevice, personalDeviceService } from '../services/personalDeviceService';
import { getIssueTagInfo } from '../utils/issueTagMapping';
import { returnToSearch } from '../utils/returnTo';

const ROUTE_KEYS: Record<string, string> = {
  DoItYourself: 'wizard.dispatch.diyTitle',
  Professional: 'wizard.dispatch.getHelpTitle',
  Recycle: 'wizard.dispatch.recycleTitle',
  Reuse: 'wizard.dispatch.reuseTitle',
};

const OUTCOME_STYLES: Record<string, { icon: string; classes: string }> = {
  Fixed: {
    icon: 'check_circle',
    classes:
      'text-customgreen-700 bg-customgreen-50 border-customgreen-300 dark:bg-customgreen-900 dark:border-customgreen-600 dark:text-customgreen-300',
  },
  PartiallyFixed: {
    icon: 'change_circle',
    classes:
      'text-yellow-700 bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-300',
  },
  EndOfLife: {
    icon: 'cancel',
    classes:
      'text-gray-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300',
  },
};

/**
 * Everything this browser, or this account, has going through the repair
 * journey — in progress on one side, answered on the other.
 *
 * Open to guests on purpose: they are most of our users, and showing them what
 * an account would keep is a better argument than telling them.
 */
const MyRepairs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const items = useSelector(
    (state: RootState) => state.pendingDeclarations.items,
  );

  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [thanked, setThanked] = useState<string[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  // A journey whose device's model is owned already: its devices, to choose
  // from, or another one.
  const [owned, setOwned] = useState<{ journeyId: string; devices: PersonalDevice[] } | null>(null);
  const { showNotification } = useNotification();

  // Entries restored from the account carry no token; the session covers them.
  const tokens = useMemo(
    () =>
      items
        .map((item) => item.declarationToken)
        .filter((token): token is string => Boolean(token)),
    [items],
  );

  const load = useCallback(() => {
    setFailed(false);
    repairJourneyService
      .list(tokens)
      .then(setJourneys)
      .catch((error) => {
        console.error('Could not load repair journeys:', error);
        setFailed(true);
      });
    // `user` is not read here, but signing in changes what the server returns.
  }, [tokens, user]);

  useEffect(load, [load]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
      new Date(iso),
    );

  /**
   * The device's name, linked to its model's page, on the variant when the
   * journey names one. Journeys described by category alone — most guest
   * ones — have nothing to link to, so they stay plain text rather than a
   * dead link.
   */
  const deviceName = (journey: JourneySummary) => {
    const label = deviceLabel(journey);
    const href = journey.modelId
      ? `/app/model/${journey.modelId}${journey.deviceId ? `?variant=${journey.deviceId}` : ''}`
      : journey.deviceId
        ? `/app/device/${journey.deviceId}`
        : null;
    if (!href) {
      return (
        <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
      );
    }
    return (
      <Link
        to={href}
        className="inline-flex items-center gap-1 font-semibold text-gray-800 dark:text-white hover:text-customgreen-700 dark:hover:text-customgreen-300 hover:underline"
        title={t('myRepairs.deviceSheet')}
      >
        {label}
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          open_in_new
        </span>
      </Link>
    );
  };

  /**
   * Where the journey's device stands among the user's own: in their devices,
   * or one click from them, typed in by hand included. Not for a guest, nor
   * for a journey about a category alone.
   */
  const myDevice = (journey: JourneySummary) => {
    if (!user) return null;
    if (journey.ownershipId) {
      return (
        <Link
          to="/app/devices?tab=mine"
          className="inline-flex items-center gap-1 text-xs font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">devices</span>
          {t('myRepairs.inMyDevices')}
        </Link>
      );
    }
    if (!journey.modelId && !(journey.brand && journey.modelType)) return null;
    const done = (message: string) => {
      showNotification(message, 'success');
      setOwned(null);
      dispatch(userDevicesUpdated());
      load();
    };
    const add = async (another: boolean) => {
      if (adding) return;
      setAdding(journey.id);
      try {
        await repairJourneyService.addPersonalDevice(journey.id, another);
        done(t('modelDetails.added', { name: deviceLabel(journey) }));
      } catch (error: any) {
        if (error?.response?.status === 409) {
          // A device of its model is owned: the journey, typed in by hand
          // included, now names the model to look for.
          const [fresh, all] = await Promise.all([
            repairJourneyService.list(tokens).catch(() => null),
            personalDeviceService.list().catch(() => []),
          ]);
          const modelId = fresh?.find((j) => j.id === journey.id)?.modelId;
          if (fresh) setJourneys(fresh);
          const devices = all.filter((d) => modelId && d.modelId === modelId);
          if (devices.length > 0) setOwned({ journeyId: journey.id, devices });
          return;
        }
        showNotification(t('modelDetails.addFailed'), 'error');
      } finally {
        setAdding(null);
      }
    };
    const tie = async (device: PersonalDevice) => {
      if (adding) return;
      setAdding(journey.id);
      try {
        await repairJourneyService.linkPersonalDevice(journey.id, device.id);
        done(t('journeyDevicePrompt.linked', { name: personalName(device) }));
      } catch {
        showNotification(t('journeyDevicePrompt.failed'), 'error');
      } finally {
        setAdding(null);
      }
    };
    if (owned?.journeyId === journey.id) {
      return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-gray-600 dark:text-gray-300">{t('myRepairs.alreadyOwned')}</span>
          {owned.devices.map((device) => (
            <button
              key={device.id}
              type="button"
              onClick={() => tie(device)}
              disabled={adding !== null}
              className="font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline disabled:opacity-50"
            >
              {personalName(device)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => add(true)}
            disabled={adding !== null}
            className="font-medium text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
          >
            {t('modelDetails.addAnother')}
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => add(false)}
        disabled={adding !== null}
        className="inline-flex items-center gap-1 text-xs font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
        {t('devicesComponent.addToMyDevices')}
      </button>
    );
  };

  const personalName = (device: PersonalDevice) =>
    device.nickname || [device.model?.brand, device.model?.name].filter(Boolean).join(' ');

  const deviceLabel = (journey: JourneySummary) =>
    [journey.brand, journey.modelType].filter(Boolean).join(' ') ||
    journey.productCategory ||
    t('declaration.yourDevice');

  const tokenFor = (journeyId: string) =>
    items.find((item) => item.journeyId === journeyId)?.declarationToken;

  const pending = (journeys ?? []).filter((j) => j.status === 'Pending');
  const declared = (journeys ?? []).filter((j) => j.status === 'Declared');

  // Only repairs that actually carry a figure. A null is unknown, not zero:
  // counting it would drag the total down and pass the loss off as a result.
  const counted = declared.filter((j) => j.co2Avoided !== null);
  const uncounted = declared.length - counted.length;
  const totalCo2 = counted.reduce((sum, j) => sum + (j.co2Avoided ?? 0), 0);

  const tagChip = (journey: JourneySummary) => {
    if (!journey.problemTag) return null;
    const info = getIssueTagInfo(journey.problemTag);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${info.badgeClasses}`}
      >
        <span className="material-symbols-outlined text-xs">{info.icon}</span>
        {t(info.displayKey)}
      </span>
    );
  };

  return (
    <div className="w-full py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
          {t('myRepairs.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('myRepairs.subtitle')}
        </p>
      </div>

      {counted.length > 0 && (
        <div className="rounded-2xl border border-customgreen-500 bg-customgreen-50 dark:bg-customgreen-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-customgreen-700 dark:text-customgreen-300">
            {t('myRepairs.totalTitle')}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {totalCo2.toFixed(1)} kg
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {t('myRepairs.totalOver', { count: counted.length })}
          </p>
          {/* Silence here would let the total pass for the whole story. */}
          {uncounted > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('myRepairs.totalUncounted', { count: uncounted })}
            </p>
          )}
        </div>
      )}

      {failed && (
        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="material-symbols-outlined text-base">error</span>
          {t('myRepairs.loadFailed')}
        </p>
      )}

      {journeys === null && !failed && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </p>
      )}

      {journeys !== null && journeys.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('myRepairs.empty')}
          </p>
          <Link
            to="/app/wizard"
            className="inline-flex items-center gap-2 mt-4 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-bold py-3 px-6 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">build</span>
            {t('myRepairs.startOne')}
          </Link>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('myRepairs.inProgress')}
          </h2>
          {pending.map((journey) => (
            <div
              key={journey.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {deviceName(journey)}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('myRepairs.startedOn', {
                      date: formatDate(journey.journeyDate),
                    })}
                    {journey.repairRoute &&
                      ` · ${t(ROUTE_KEYS[journey.repairRoute] ?? journey.repairRoute)}`}
                  </p>
                  {myDevice(journey)}
                </div>
                {tagChip(journey)}
              </div>

              {!asksForOutcome(journey.repairRoute) ? null : thanked.includes(journey.id) ? (
                <p className="flex items-center gap-2 text-sm font-medium text-customgreen-700 dark:text-customgreen-300">
                  <span className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  {t('declaration.thanks')}
                </p>
              ) : openFor === journey.id ? (
                <RepairDeclarationForm
                  journeyId={journey.id}
                  declarationToken={tokenFor(journey.id)}
                  deviceLabel={deviceLabel(journey)}
                  onDeclared={() => {
                    setThanked((ids) => [...ids, journey.id]);
                    setOpenFor(null);
                    dispatch(markDeclarationDone(journey.id));
                    load();
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenFor(journey.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-customgreen-600 text-white text-sm font-medium px-4 py-2"
                >
                  <span className="material-symbols-outlined text-base">
                    rate_review
                  </span>
                  {t('myRepairs.declare')}
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {declared.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('myRepairs.finished')}
          </h2>
          {declared.map((journey) => {
            const style = journey.outcome
              ? OUTCOME_STYLES[journey.outcome]
              : undefined;
            return (
              <div
                key={journey.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div>
                  {deviceName(journey)}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {journey.declaredAt &&
                      t('myRepairs.declaredOn', {
                        date: formatDate(journey.declaredAt),
                      })}
                  </p>
                  {myDevice(journey)}
                </div>
                <div className="flex items-center gap-3">
                  {journey.co2Avoided !== null && (
                    <span className="text-sm font-semibold text-customgreen-700 dark:text-customgreen-300">
                      {journey.co2Avoided.toFixed(1)} kg
                    </span>
                  )}
                  {style && journey.outcome && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${style.classes}`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {style.icon}
                      </span>
                      {t(`myRepairs.outcomes.${journey.outcome}`)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* The argument for an account, made where its absence is visible. */}
      {!user && journeys !== null && journeys.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {t('myRepairs.guestNotice')}
          </p>
          <Link
            to={`/create-account${returnToSearch('/app/my-repairs')}`}
            className="inline-flex items-center rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-semibold py-2 px-4 transition-colors"
          >
            {t('journeyPrompt.createAccount')}
          </Link>
        </div>
      )}

      {user && (
        <Link
          to="/app/devices?tab=mine"
          className="inline-flex items-center gap-2 text-sm font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
        >
          <span className="material-symbols-outlined text-base">devices</span>
          {t('myRepairs.myDevices')}
        </Link>
      )}
    </div>
  );
};

export default MyRepairs;
