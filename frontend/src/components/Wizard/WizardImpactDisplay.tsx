import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { deviceService, ImpactMetrics } from '../../services/deviceService';
import { Device } from '../../models/device'; // Import Device model
import ImpactDisplayGrid from '../common/ImpactDisplayGrid';

interface WizardImpactDisplayProps {
  device?: Device;
}

export const WizardImpactDisplay: React.FC<WizardImpactDisplayProps> = ({ device }) => {
  const { t } = useTranslation();
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The category is the whole input now: the reference data gives CO2e per
    // category, so a device whose weight is unknown is no longer excluded.
    // The untranslated name: `name` is localised, so matching on it found
    // nothing outside English.
    const category = device?.categories?.[0];
    const deviceCategory =
      category?.canonicalName || category?.name || device?.device_type || '';
    if (!deviceCategory) {
      setImpactMetrics(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    deviceService
      .fetchFixometerImpactMetrics(deviceCategory)
      .then((metrics) => { if (!cancelled) setImpactMetrics(metrics); })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Failed to calculate impact metrics.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [device]);

  if (loading) {
    return (
      <div className="px-4 py-3 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800 text-center flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-customgreen-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-2">{t('wizard.calculatingImpact')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!impactMetrics) {
    return null; // Don't show anything if there are no metrics
  }

  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{t('wizard.ecologicalImpact')}</h3>
      {impactMetrics && <ImpactDisplayGrid impactMetrics={impactMetrics} compact />}
    </div>
  );
};