import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../stores/globalStore';
import { deviceService, ImpactMetrics } from '../../services/deviceService';
import { Device } from '../../models/device';
import { CalculateRouteResponse } from '../../services/fastPlanEcoService';

interface WizardImpactDisplayCompactProps {
  device?: Device;
  dispatchChoice: 'doItYourself' | 'getHelp' | undefined;
  ecoData: CalculateRouteResponse | null | undefined;
  selectedDeviceType?: string;
}

const WizardImpactDisplayCompact: React.FC<WizardImpactDisplayCompactProps> = ({ device, dispatchChoice, ecoData, selectedDeviceType }) => {
  const { t } = useTranslation();
  const { step } = useSelector((state: RootState) => state.repairWorkflow);
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dispatchChoice !== 'doItYourself') {
      setImpactMetrics(null);
      setLoading(false);
      return;
    }

    // Only the category matters now, so a category-only selection no longer
    // needs the invented default weight of 1 kg it used to be given.
    // The untranslated name: `name` is localised, and matching on it found
    // nothing outside English.
    const category = device?.categories?.[0];
    const categoryToUse =
      category?.canonicalName ||
      category?.name ||
      device?.device_type ||
      selectedDeviceType ||
      '';
    if (!categoryToUse) {
      setImpactMetrics(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    deviceService
      .fetchFixometerImpactMetrics(categoryToUse)
      .then((metrics) => { if (!cancelled) setImpactMetrics(metrics); })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Failed to calculate impact metrics.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [device, dispatchChoice, selectedDeviceType]);

  if (!dispatchChoice) {
    return null;
  }

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

  if (dispatchChoice === 'doItYourself') {
    if (!impactMetrics) {
      return null;
    }
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="flex items-center gap-4">
                   <div className="text-customgreen-500">
                  <span className="material-symbols-outlined text-4xl">eco</span>
                </div>
                  <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{t('wizard.positiveImpact')}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('wizard.impactCo2Prefix')} <span className="font-bold text-gray-900 dark:text-white">{impactMetrics.co2.toFixed(2)} {t('wizard.impactCo2Suffix')}</span>.
                      </p>
                  </div>
              </div>
              <Link to={{ pathname: "/app/impact-details", state: { fromWizardStep: step } }} className="text-sm font-medium text-customgreen-500 hover:underline">
                  {t('wizard.learnMoreImpact')}
              </Link>
          </div>
      </div>
    );
  }

  if (dispatchChoice === 'getHelp') {
    if (!ecoData) {
      return null;
    }
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-4">
                <div className="text-customgreen-500">
                  <span className="material-symbols-outlined text-4xl">eco</span>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{t('wizard.transportImpact')}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('wizard.transportDesc')} <span className="font-bold text-gray-900 dark:text-white">{(ecoData.carbonFootprint / 1000).toFixed(2)} {t('wizard.transportCo2Suffix')}</span>.
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return null;
};

export default WizardImpactDisplayCompact;