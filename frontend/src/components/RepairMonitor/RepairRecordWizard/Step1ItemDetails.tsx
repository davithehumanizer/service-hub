import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, Select, NumberInput, Button, Loader } from '@mantine/core';
import { deviceModelService } from '../../../services/deviceModelService';
import { repairMonitorService, RepairCategory } from '../../../services/repairMonitorService';
import { DeviceModel } from '../../../models/deviceModel';

interface Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

const Step1ItemDetails: React.FC<Props> = ({ data, onChange }) => {
  const { t } = useTranslation();

  const [repairCategories, setRepairCategories] = useState<RepairCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryAutoDetected, setCategoryAutoDetected] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<DeviceModel[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceModel | null>(null);

  useEffect(() => {
    repairMonitorService.getRepairCategories()
      .then(setRepairCategories)
      .catch(() => setRepairCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const categoryOptions = repairCategories.map((c) => ({ value: c.slug, label: c.name }));

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      // One suggestion per model: a record names a model, not a catalogue entry.
      const res = await deviceModelService.search({ search: q, limit: 8 });
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search, doSearch]);

  const handleSelectDevice = (device: DeviceModel) => {
    setSelectedDevice(device);
    setResults([]);
    setSearch('');

    // Resolve repair category from device's category IDs via mappings
    const deviceCategoryIds: number[] = (device.categories ?? []).map((c) => c.id);
    let resolvedSlug = '';
    for (const catId of deviceCategoryIds) {
      const match = repairCategories.find((rc) =>
        rc.deviceCategoryIds.includes(catId),
      );
      if (match) {
        resolvedSlug = match.slug;
        break;
      }
    }

    setCategoryAutoDetected(!!resolvedSlug);
    // productCategoryId held the chosen entry's id, never a category: no
    // longer filled (Corentin, 07/10).
    onChange({
      brand: device.brand || '',
      modelType: device.name || '',
      productCategory: resolvedSlug || data.productCategory || '',
    });
  };

  const handleClearDevice = () => {
    setSelectedDevice(null);
    setCategoryAutoDetected(false);
    onChange({ brand: '', modelType: '', productCategoryId: '' });
  };

  return (
    <div className="space-y-8">

      {/* Device search */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-teal-600 dark:text-teal-400">search</span>
          {t('repairMonitor.step1.searchTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('repairMonitor.step1.searchDesc')}
        </p>

        {selectedDevice ? (
          <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700 rounded-xl">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">check_circle</span>
            <span className="text-sm font-medium text-teal-800 dark:text-teal-300 flex-1">
              {selectedDevice.brand} {selectedDevice.name}
            </span>
            <Button variant="subtle" color="gray" size="xs" onClick={handleClearDevice}>
              {t('repairMonitor.step1.change')}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <TextInput
              placeholder={t('repairMonitor.step1.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<span className="material-symbols-outlined text-sm text-gray-400">search</span>}
              rightSection={searching ? <span className="material-symbols-outlined animate-spin text-sm text-teal-500">progress_activity</span> : null}
            />
            {results.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mt-1 max-h-52 overflow-y-auto">
                {results.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => handleSelectDevice(d)}
                    className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-gray-400">devices</span>
                    <span className="font-medium">{d.brand}</span> {d.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Manual fields */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-blue-500">edit</span>
          {t('repairMonitor.step1.detailsTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t('repairMonitor.step1.detailsDesc')}
        </p>
        <div className="space-y-4">
          <TextInput
            label={t('repairMonitor.step1.brand')}
            placeholder={t('repairMonitor.step1.brandPlaceholder')}
            value={data.brand || ''}
            onChange={(e) => onChange({ brand: e.currentTarget.value })}
          />
          <TextInput
            label={t('repairMonitor.step1.modelType')}
            placeholder={t('repairMonitor.step1.modelPlaceholder')}
            value={data.modelType || ''}
            onChange={(e) => onChange({ modelType: e.currentTarget.value })}
          />
          <Select
            label={t('repairMonitor.step1.category')}
            placeholder={t('repairMonitor.step1.categoryPlaceholder')}
            data={categoryOptions}
            value={data.productCategory || null}
            onChange={(v) => {
              setCategoryAutoDetected(false);
              onChange({ productCategory: v || '' });
            }}
            rightSection={categoriesLoading ? <Loader size="xs" /> : undefined}
            clearable
          />
          {categoryAutoDetected && (
            <p className="text-xs text-teal-600 dark:text-teal-400 -mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              {t('repairMonitor.step1.categoryAutoDetected')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label={t('repairMonitor.step1.yearOfManufacture')}
              placeholder={t('repairMonitor.step1.yearPlaceholder')}
              value={data.yearOfManufacture ?? ''}
              onChange={(v) => onChange({ yearOfManufacture: v || undefined })}
              min={1900}
              max={new Date().getFullYear()}
            />
            <NumberInput
              label={t('repairMonitor.step1.productAge')}
              placeholder={t('repairMonitor.step1.agePlaceholder')}
              value={data.productAge ?? ''}
              onChange={(v) => onChange({ productAge: v || undefined })}
              min={0}
              step={0.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1ItemDetails;
