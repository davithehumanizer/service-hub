import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, TextInput, SegmentedControl } from '@mantine/core';
import { deviceService, ImpactMetrics } from '../../services/deviceService';
import { Device } from '../../models/device';
import ImpactDisplayGrid from '../common/ImpactDisplayGrid';
import DevicePicker from './DevicePicker';

interface FixometerImpactCalculatorProps {
  device?: Device;
  routeName: string;
}

type Mode = 'device' | 'category';

/** The category a device belongs to, untranslated — never its localised label. */
const categoryOf = (device?: Device): string =>
  device?.categories?.[0]?.canonicalName ||
  device?.categories?.[0]?.name ||
  device?.device_type ||
  '';

/**
 * Two ways in, one answer.
 *
 * Starting from a device is easier — people know what they own, not which of
 * 349 categories it falls under — but it is **not more precise**: the figures
 * are per category, so a named model and its category give the same number.
 * The category actually used is therefore always shown, and can be corrected.
 *
 * Presenting the two as rival levels of accuracy would promise a precision
 * this data does not have.
 */
const FixometerImpactCalculator: React.FC<FixometerImpactCalculatorProps> = ({
  device,
}) => {
  const { t } = useTranslation();

  // Opens on the device tab: naming what you own is the easier question, and
  // the picker points at the category tab when it finds nothing. A device
  // carried in from elsewhere arrives here already filled, rather than
  // silently pre-filling a category nobody chose.
  const [mode, setMode] = useState<Mode>('device');
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(device);
  const [deviceCategory, setDeviceCategory] = useState(categoryOf(device));

  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics | null>(null);
  const [noReferenceData, setNoReferenceData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtherCategoryInput, setShowOtherCategoryInput] = useState(false);
  const [categories, setCategories] = useState<
    { id: number; name: string; canonicalName?: string }[]
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    deviceService
      .getCategories()
      .then((data) => {
        setCategories([...data].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    if (!device) return;
    setSelectedDevice(device);
    setDeviceCategory(categoryOf(device));
    setMode('device');
  }, [device]);

  // Computed as soon as there is a category, from either tab: the answer is
  // one cheap call, so making people press a button afterwards buys nothing.
  useEffect(() => {
    if (!deviceCategory) {
      setImpactMetrics(null);
      setNoReferenceData(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    deviceService
      .fetchFixometerImpactMetrics(deviceCategory)
      .then((metrics) => {
        if (cancelled) return;
        setImpactMetrics(metrics);
        // Not covered by the reference data — large appliances and musical
        // instruments, mainly. Saying so beats showing a zero.
        setNoReferenceData(metrics === null);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to calculate impact metrics.');
          setImpactMetrics(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceCategory]);

  const handleCategoryChange = (value: string | null) => {
    if (value === '__custom__') {
      setShowOtherCategoryInput(true);
      setDeviceCategory('');
    } else {
      setShowOtherCategoryInput(false);
      setDeviceCategory(value ?? '');
    }
  };

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'category') {
      // The category stays, so correcting a wrong guess starts from it.
      setSelectedDevice(undefined);
    }
  }, []);

  /** The localised label for a canonical category name. */
  const labelFor = (canonical: string) =>
    categories.find((c) => (c.canonicalName || c.name) === canonical)?.name ||
    canonical;

  // Value is the untranslated name — what the impact lookup keys on — while
  // the label stays in the reader's language.
  const categorySelectData = [
    ...categories
      .map((c) => ({ value: c.canonicalName || c.name, label: c.name }))
      .filter((opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx),
    { value: '__custom__', label: t('fixometer.otherCategory') },
  ];

  return (
    <div className="px-4 py-3 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <h2 className="text-lg font-semibold mb-4">{t('fixometer.calculateTitle')}</h2>

      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(value) => switchMode(value as Mode)}
        data={[
          { value: 'device', label: t('fixometer.modeDevice') },
          { value: 'category', label: t('fixometer.modeCategory') },
        ]}
        mb="md"
        // fullWidth stretches the control, but each segment's label still
        // demands its own unbroken width — on narrow screens that forced the
        // whole page wider. Letting the label wrap keeps it inside its segment.
        styles={{ innerLabel: { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.2 } }}
      />

      {mode === 'device' ? (
        <>
          <DevicePicker
            selected={selectedDevice}
            onSelect={(found) => {
              setSelectedDevice(found);
              setDeviceCategory(categoryOf(found));
            }}
            onClear={() => {
              setSelectedDevice(undefined);
              setDeviceCategory('');
            }}
          />

          {/* What the figure is really based on. Without this the device tab
              would imply a per-model accuracy the data does not have. */}
          {selectedDevice && deviceCategory && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {t('fixometer.resolvedCategory', {
                category: labelFor(deviceCategory),
              })}{' '}
              <button
                type="button"
                onClick={() => switchMode('category')}
                className="font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
              >
                {t('fixometer.correctCategory')}
              </button>
            </p>
          )}

          {selectedDevice && !deviceCategory && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {t('fixometer.deviceWithoutCategory')}{' '}
              <button
                type="button"
                onClick={() => switchMode('category')}
                className="font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
              >
                {t('fixometer.correctCategory')}
              </button>
            </p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label={t('fixometer.deviceCategory')}
            placeholder={
              loadingCategories
                ? t('fixometer.loadingCategories')
                : t('fixometer.selectCategory')
            }
            data={categorySelectData}
            value={showOtherCategoryInput ? '__custom__' : deviceCategory || null}
            onChange={handleCategoryChange}
            searchable
            disabled={loadingCategories}
            nothingFoundMessage={t('fixometer.noCategoryFound')}
          />
          {showOtherCategoryInput && (
            <TextInput
              label={t('fixometer.customCategory')}
              placeholder={t('fixometer.enterCategory')}
              value={deviceCategory}
              onChange={(e) => setDeviceCategory(e.currentTarget.value)}
            />
          )}
        </div>
      )}

      {loading && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t('fixometer.calculating')}
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-500">
          {t('fixometer.calculationFailed')}
        </p>
      )}

      {noReferenceData && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          {t('fixometer.noReferenceData')}
        </p>
      )}

      {impactMetrics && (
        <div className="mt-4">
          <ImpactDisplayGrid impactMetrics={impactMetrics} />
        </div>
      )}
    </div>
  );
};

export default FixometerImpactCalculator;
