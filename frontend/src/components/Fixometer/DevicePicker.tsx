import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, Loader } from '@mantine/core';
import { deviceModelService } from '../../services/deviceModelService';
import { Device } from '../../models/device';
import { DeviceModel } from '../../models/deviceModel';
import { useDebounce } from '../../utils/useDebounce';

interface DevicePickerProps {
  selected?: Device;
  onSelect: (device: Device) => void;
  onClear: () => void;
}

/** Below this, a search matches half the catalogue and helps nobody. */
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

/**
 * Finds a device by brand or model: one result per model, not per catalogue
 * entry, and no made-up devices when the search fails.
 *
 * People know what they own, not which of our 349 categories it belongs to,
 * so this is the easier way in. It resolves to a category all the same — the
 * impact figures are per category — which is why the caller shows which one
 * it landed on.
 */
const DevicePicker: React.FC<DevicePickerProps> = ({
  selected,
  onSelect,
  onClear,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeviceModel[]>([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    if (debounced.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    deviceModelService
      .search({ search: debounced.trim(), limit: MAX_RESULTS })
      .then((page) => {
        if (!cancelled) setResults(page.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-base text-customgreen-500">
            devices
          </span>
          <span className="font-medium text-gray-800 dark:text-white truncate">
            {[selected.brand, selected.model].filter(Boolean).join(' ')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setResults([]);
            onClear();
          }}
          className="text-sm font-medium text-customgreen-700 dark:text-customgreen-300 hover:underline"
        >
          {t('fixometer.changeDevice')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <TextInput
        label={t('fixometer.deviceLabel')}
        placeholder={t('fixometer.devicePlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        rightSection={searching ? <Loader size="xs" /> : null}
      />

      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
          {results.map((found) => (
            <li key={found.id}>
              <button
                type="button"
                // The model alone: the impact is the category's.
                onClick={() => deviceModelService.deviceOf(found).then(onSelect)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="block text-sm font-medium text-gray-800 dark:text-white">
                  {[found.brand, found.name].filter(Boolean).join(' ')}
                </span>
                {found.categories?.[0]?.name && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {found.categories[0].name}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!searching &&
        debounced.trim().length >= MIN_QUERY_LENGTH &&
        results.length === 0 && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('fixometer.noDeviceFound')}
          </p>
        )}
    </div>
  );
};

export default DevicePicker;
