import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { RootState } from '../../stores/globalStore';
import { userDevicesUpdated } from '../../stores/authSlice';
import { dismissDevicePrompt, setJourneyOwnership } from '../../stores/repairWorkflowSlice';
import { useNotification } from '../../context/NotificationContext';
import { PersonalDevice, personalDeviceService } from '../../services/personalDeviceService';
import { repairJourneyService } from '../../services/repairJourneyService';
import { variantName } from '../Devices/VariantPicker';

/**
 * Offers a signed-in user to put the journey just recorded in the repair
 * history of one of their devices: one of the same model they already have,
 * or the device added now, with the state the journey recorded (§4.0 bis). A
 * device typed in by hand can only be added: it joins the catalogue then.
 *
 * The counterpart of JourneyAccountPrompt, which only guests see. Nothing
 * here is required: the journey is recorded either way.
 */
const JourneyDevicePrompt: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    journeyId,
    journeyModelId,
    journeyDeviceName,
    journeyOwnershipId,
    devicePromptDismissed,
    repairContext,
  } = useSelector((state: RootState) => state.repairWorkflow);
  // The journey's, not the wizard's: the device can be changed after the
  // journey is recorded, which keeps its own.
  const [modelId, setModelId] = useState<number | null>(journeyModelId ?? null);
  const unlisted = modelId == null && Boolean(journeyDeviceName);
  const [mine, setMine] = useState<PersonalDevice[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setModelId(journeyModelId ?? null), [journeyModelId]);

  useEffect(() => {
    if (!user || !modelId) return;
    let current = true;
    personalDeviceService
      .list()
      .then((all) => current && setMine(all.filter((d) => d.modelId === modelId)))
      .catch(() => current && setMine([]));
    return () => {
      current = false;
    };
  }, [user, modelId]);

  // A journey about a category alone has no device to own; a repairer's is
  // about a customer's device.
  if (!user || repairContext === 'repairer' || !journeyId) return null;
  if (!unlisted && (!modelId || mine === null)) return null;
  if (devicePromptDismissed && !journeyOwnershipId) return null;

  const nameOf = (device: PersonalDevice) =>
    device.nickname || [device.model?.brand, device.model?.name].filter(Boolean).join(' ');

  const linkTo = async (device: PersonalDevice) => {
    await repairJourneyService.linkPersonalDevice(journeyId, device.id);
    dispatch(setJourneyOwnership(device.id));
    dispatch(userDevicesUpdated());
  };

  const choose = async (device: PersonalDevice) => {
    if (busy) return;
    setBusy(true);
    try {
      await linkTo(device);
    } catch {
      showNotification(t('journeyDevicePrompt.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Made from the journey on the server, in one go: nothing is left half
  // done when the link fails. Another device of a model owned only when
  // asked for, from the list of those owned.
  const add = async (another: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const tied = await repairJourneyService.addPersonalDevice(journeyId, another);
      setMine(await personalDeviceService.list().then((all) => all.filter((d) => d.modelId === tied.modelId)));
      setModelId(tied.modelId);
      dispatch(setJourneyOwnership(tied.ownershipId));
      dispatch(userDevicesUpdated());
    } catch (error: any) {
      if (error?.response?.status === 409) {
        // Already in a device's history, or a device of its model is owned,
        // typed in by hand included: the journey as it now is says which.
        const journey = (await repairJourneyService.list([]).catch(() => [])).find((j) => j.id === journeyId);
        if (journey?.modelId) {
          const modelOf = journey.modelId;
          setModelId(modelOf);
          setMine(await personalDeviceService.list().then((all) => all.filter((d) => d.modelId === modelOf)).catch(() => []));
        }
        if (journey?.ownershipId) dispatch(setJourneyOwnership(journey.ownershipId));
        if (journey?.modelId || journey?.ownershipId) return;
      }
      showNotification(t('journeyDevicePrompt.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const linked = journeyOwnershipId ? mine?.find((d) => d.id === journeyOwnershipId) : undefined;
  if (journeyOwnershipId) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <span className="material-symbols-outlined text-base text-customgreen-500">check_circle</span>
          {linked
            ? t('journeyDevicePrompt.linked', { name: nameOf(linked) })
            : t('journeyDevicePrompt.linkedUnnamed')}
        </p>
        <Link
          to="/app/devices?tab=mine"
          className="text-sm font-semibold text-customgreen-700 dark:text-customgreen-300 hover:underline"
        >
          {t('journeyDevicePrompt.seeMyDevices')}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-base text-customgreen-500 mt-0.5">devices</span>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('journeyDevicePrompt.title')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {unlisted
                ? t('journeyDevicePrompt.unlistedText', { name: journeyDeviceName })
                : t('journeyDevicePrompt.text')}
            </p>
          </div>
          {mine && mine.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-200">{t('journeyDevicePrompt.isItYours')}</p>
              <ul className="space-y-2">
                {mine.map((device) => (
                  <li key={device.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => choose(device)}
                      className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-customgreen-500 px-3 py-2 disabled:opacity-50"
                    >
                      <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 break-words">
                        {nameOf(device)}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 break-words">
                        {device.variant ? variantName(device.variant) : t('personalDevices.variantUnknown')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => add(Boolean(mine && mine.length > 0))}
              className="inline-flex items-center gap-1.5 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-semibold py-2 px-4 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {mine && mine.length > 0 ? t('journeyDevicePrompt.addAnother') : t('devicesComponent.addToMyDevices')}
            </button>
            <button
              type="button"
              onClick={() => dispatch(dismissDevicePrompt())}
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline py-2"
            >
              {t('journeyPrompt.later')}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('journeyDevicePrompt.prefilled')}</p>
        </div>
      </div>
    </div>
  );
};

export default JourneyDevicePrompt;
