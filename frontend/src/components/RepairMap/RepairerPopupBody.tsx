import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { repairerService } from '../../services/repairerService';
import { Repairer } from '../../models/repairer';
import { getCountryName } from '../../utils/countryMapper';
import { translateRepairerDeviceType } from '../../utils/repairerDeviceTypeUtils';
import { PARTNER_CATEGORY_ICON, partnerActivities } from '../../utils/partnerTypes';

/**
 * The card behind a map pin, fetched when the pin is opened.
 *
 * It owns its own fetch on purpose. Holding the loaded repairers in the page
 * would put them in the marker list's dependencies, and every arrival would
 * rebuild the whole cluster group — closing the very popup that triggered it.
 *
 * A marker carries an id and a position and nothing else; that leanness is
 * what lets the map draw every repairer in view, and this is where the rest
 * is paid for, once, for the one the reader actually asked about.
 */
const RepairerPopupBody: React.FC<{
  id: string;
  /** Ids already reported, shared across popup mounts so it survives a reopen. */
  reportedIds: React.MutableRefObject<Set<string>>;
  onReport: (id: string) => Promise<void>;
}> = ({ id, reportedIds, onReport }) => {
  const { t } = useTranslation();
  const [repairer, setRepairer] = useState<Repairer | null>(null);
  const [failed, setFailed] = useState(false);
  const [reported, setReported] = useState(() => reportedIds.current.has(id));
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRepairer(null);
    setFailed(false);
    repairerService
      .getRepairer(id)
      .then((data) => {
        if (!cancelled) setRepairer(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleReport = async () => {
    if (reporting || reported) return;
    setReporting(true);
    try {
      await onReport(id);
      reportedIds.current.add(id);
      setReported(true);
    } finally {
      setReporting(false);
    }
  };

  if (failed) {
    return (
      <div className="p-4 text-sm text-gray-500">
        {t('repairMap.repairerUnavailable')}
      </div>
    );
  }

  if (!repairer) {
    return (
      <div className="p-4 text-sm text-gray-500">
        {t('repairMap.loadingRepairer')}
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex items-start space-x-3 mb-4">
        <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-purple-400 mt-1">business</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {repairer.name}
          </h3>
          {/* One badge per activity: a place that repairs and resells shows both. */}
          <div className="flex flex-wrap gap-1 mb-1">
            {partnerActivities(repairer.partner_type).map((activity) => (
              <span key={activity} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <span className="material-symbols-outlined text-xs mr-1">{PARTNER_CATEGORY_ICON[activity]}</span>
                {t(`repairMap.partnerTypeOptions.${activity}`)}
              </span>
            ))}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="material-symbols-outlined text-sm mr-1">location_on</span>
            {repairer.address}, {repairer.postal_code} {repairer.countryName ?? getCountryName(repairer.country)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {repairer.website && (
          <div className="flex items-center">
            <span className="material-symbols-outlined text-sm text-gray-400 dark:text-gray-500 mr-2">language</span>
            <a
              href={repairer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-sm"
            >
              {t('repairMap.visitWebsite')}
            </a>
          </div>
        )}

        {repairer.phone && (
          <div className="flex items-center">
            <span className="material-symbols-outlined text-sm text-gray-400 dark:text-gray-500 mr-2">phone</span>
            <a href={`tel:${repairer.phone}`} className="hover:underline text-sm">
              {repairer.phone}
            </a>
          </div>
        )}

        {repairer.email && (
          <div className="flex items-center">
            <span className="material-symbols-outlined text-sm text-gray-400 dark:text-gray-500 mr-2">email</span>
            <a href={`mailto:${repairer.email}`} className="hover:underline text-sm">
              {repairer.email}
            </a>
          </div>
        )}
      </div>

      {repairer.repairerDevices && repairer.repairerDevices.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="material-symbols-outlined text-sm text-gray-400 dark:text-gray-500 mr-2">devices</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('repairMap.supportedDevices')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {repairer.repairerDevices.slice(0, 5).map((device, index) => (
              <span
                key={`${repairer.repairer_id}_${device.repairer_device_id}_${index}`}
                className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-100 text-gray-700  text-xs rounded-full"
              >
                {translateRepairerDeviceType(device.device_type, t)}
              </span>
            ))}
            {repairer.repairerDevices.length > 5 && (
              <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                {t('repairMap.moreDevices', { count: repairer.repairerDevices.length - 5 })}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Link
          to={`/app/repairer/${repairer.repairer_id}`}
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 transition-colors duration-200 repairer-details-link"
        >
          <span className="material-symbols-outlined text-sm mr-2">visibility</span>
          {t('repairMap.viewDetails')}
        </Link>
      </div>
      <div className="mt-2">
        {reported ? (
          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            {t('repairMap.reportIrrelevant.confirmation')}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleReport}
            disabled={reporting}
            className="inline-flex items-center justify-center w-full px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-xs mr-1">outlined_flag</span>
            {t('repairMap.reportIrrelevant.button')}
          </button>
        )}
      </div>
    </div>
  );
};

export default RepairerPopupBody;
