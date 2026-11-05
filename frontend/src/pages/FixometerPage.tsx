import React from 'react';
import { useTranslation } from 'react-i18next';
import FixometerImpactCalculator from '../components/Fixometer/FixometerImpactCalculator';
import { useLocation } from 'react-router-dom';
import { Device } from '../models/device'; // Import Device model
import { useSelector } from 'react-redux';
import { RootState } from '../stores/globalStore';

const FixometerPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  // Explicitly check if location.state is an object and has a device property
  const deviceFromLocation = (location.state && typeof location.state === 'object' && 'device' in location.state)
    ? (location.state as { device: Device }).device
    : undefined;
  const { globalDevice: currentDeviceFromRedux } = useSelector((state: RootState) => state.device);

  const deviceToUse = deviceFromLocation || currentDeviceFromRedux;

  return (
    <>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mt-4 mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400 mr-3">calculate</span>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('fixometer.title')}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('fixometer.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <FixometerImpactCalculator device={deviceToUse} routeName="Impact calculator" />
        </div>
    </>
  );
};

export default FixometerPage;