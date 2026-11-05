import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, TextInput, Badge } from '@mantine/core';

const STATUS_COLORS: Record<string, string> = {
  Fixed: 'green', PartiallyFixed: 'yellow', Repairable: 'blue', EndOfLife: 'red', Unknown: 'gray', Other: 'gray',
};

interface Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

const Step3RepairOutcome: React.FC<Props> = ({ data, onChange }) => {
  const { t } = useTranslation();

  const REPAIR_STATUSES = [
    { value: 'Fixed', label: t('repairMonitor.step3.statuses.Fixed') },
    { value: 'PartiallyFixed', label: t('repairMonitor.step3.statuses.PartiallyFixed') },
    { value: 'Repairable', label: t('repairMonitor.step3.statuses.Repairable') },
    { value: 'EndOfLife', label: t('repairMonitor.step3.statuses.EndOfLife') },
    { value: 'Unknown', label: t('repairMonitor.step3.statuses.Unknown') },
    { value: 'Other', label: t('repairMonitor.step3.statuses.Other') },
  ];

  const REPAIR_BARRIERS = [
    { value: 'TooExpensive', label: t('repairMonitor.step3.barriers.TooExpensive') },
    { value: 'SparePartsUnavailable', label: t('repairMonitor.step3.barriers.SparePartsUnavailable') },
    { value: 'NoSkillsInfo', label: t('repairMonitor.step3.barriers.NoSkillsInfo') },
    { value: 'ProductDesign', label: t('repairMonitor.step3.barriers.ProductDesign') },
    { value: 'NoFaultFound', label: t('repairMonitor.step3.barriers.NoFaultFound') },
    { value: 'BeyondEconomicRepair', label: t('repairMonitor.step3.barriers.BeyondEconomicRepair') },
    { value: 'Other', label: t('repairMonitor.step3.barriers.Other') },
  ];

  const COUNTRIES = [
    { value: 'BEL', label: t('repairMonitor.filters.countries.BEL') },
    { value: 'FRA', label: t('repairMonitor.filters.countries.FRA') },
    { value: 'NLD', label: t('repairMonitor.filters.countries.NLD') },
    { value: 'DEU', label: t('repairMonitor.filters.countries.DEU') },
    { value: 'GBR', label: t('repairMonitor.filters.countries.GBR') },
    { value: 'AUS', label: t('repairMonitor.filters.countries.AUS') },
  ];

  const showBarrier = data.repairStatus === 'EndOfLife';

  return (
    <div className="space-y-8">

      {/* Outcome */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-teal-600 dark:text-teal-400">task_alt</span>
          {t('repairMonitor.step3.outcomeTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t('repairMonitor.step3.outcomeDesc')}
        </p>
        <div className="space-y-4">
          <Select
            label={<span>{t('repairMonitor.step3.repairResult')} <span className="text-red-500">*</span></span>}
            placeholder={t('repairMonitor.step3.selectOutcome')}
            data={REPAIR_STATUSES}
            value={data.repairStatus || null}
            onChange={(v) => onChange({ repairStatus: v || '' })}
          />
          {data.repairStatus && (
            <div className="flex items-center gap-2">
              <Badge color={STATUS_COLORS[data.repairStatus] || 'gray'} variant="light" size="lg">
                {REPAIR_STATUSES.find(s => s.value === data.repairStatus)?.label}
              </Badge>
            </div>
          )}
          {showBarrier && (
            <Select
              label={t('repairMonitor.step3.barrier')}
              placeholder={t('repairMonitor.step3.barrierPlaceholder')}
              data={REPAIR_BARRIERS}
              value={data.repairBarrier || null}
              onChange={(v) => onChange({ repairBarrier: v || '' })}
              clearable
            />
          )}
        </div>
      </div>

      {/* Context */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-blue-500">info</span>
          {t('repairMonitor.step3.contextTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t('repairMonitor.step3.contextDesc')}
        </p>
        <div className="space-y-4">
          <TextInput
            label={t('repairMonitor.step3.eventDate')}
            type="date"
            value={data.eventDate || ''}
            onChange={(e) => onChange({ eventDate: e.currentTarget.value })}
            styles={{ input: { maxWidth: 220 } }}
          />
          <Select
            label={t('repairMonitor.filters.country')}
            placeholder={t('repairMonitor.filters.selectCountry')}
            data={COUNTRIES}
            value={data.country || null}
            onChange={(v) => onChange({ country: v || '' })}
            clearable
          />
          <TextInput
            label={t('repairMonitor.step3.dataProvider')}
            placeholder={t('repairMonitor.step3.dataProviderPlaceholder')}
            value={data.dataProvider || ''}
            onChange={(e) => onChange({ dataProvider: e.currentTarget.value })}
          />
          <TextInput
            label={t('repairMonitor.step3.groupIdentifier')}
            placeholder={t('repairMonitor.step3.groupPlaceholder')}
            value={data.groupIdentifier || ''}
            onChange={(e) => onChange({ groupIdentifier: e.currentTarget.value })}
          />
        </div>
      </div>
    </div>
  );
};

export default Step3RepairOutcome;
