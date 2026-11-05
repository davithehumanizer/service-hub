import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, Select, Button, Group } from '@mantine/core';
import { StatsFilter } from '../../services/repairMonitorService';

interface Props {
  value: StatsFilter;
  onChange: (filters: StatsFilter) => void;
}

const DashboardFilters: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(value.dateFrom || '');
  const [dateTo, setDateTo] = useState(value.dateTo || '');
  const [country, setCountry] = useState(value.country || '');

  const COUNTRIES = [
    { label: t('repairMonitor.filters.allCountries'), value: '' },
    { label: t('repairMonitor.filters.countries.BEL'), value: 'BEL' },
    { label: t('repairMonitor.filters.countries.FRA'), value: 'FRA' },
    { label: t('repairMonitor.filters.countries.NLD'), value: 'NLD' },
    { label: t('repairMonitor.filters.countries.DEU'), value: 'DEU' },
    { label: t('repairMonitor.filters.countries.GBR'), value: 'GBR' },
    { label: t('repairMonitor.filters.countries.AUS'), value: 'AUS' },
  ];

  const handleApply = () => {
    onChange({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, country: country || undefined });
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setCountry('');
    onChange({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-base text-gray-500">filter_list</span>
        {t('repairMonitor.filters.title')}
      </h3>
      <Group align="flex-end" gap="sm" wrap="wrap">
        <TextInput
          label={t('repairMonitor.filters.from')}
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.currentTarget.value)}
          styles={{ input: { minWidth: 150 } }}
        />
        <TextInput
          label={t('repairMonitor.filters.to')}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.currentTarget.value)}
          styles={{ input: { minWidth: 150 } }}
        />
        <Select
          label={t('repairMonitor.filters.country')}
          data={COUNTRIES}
          value={country}
          onChange={(v) => setCountry(v || '')}
          clearable
          styles={{ input: { minWidth: 180 } }}
        />
        <Button
          color="teal"
          onClick={handleApply}
          leftSection={<span className="material-symbols-outlined text-sm">search</span>}
        >
          {t('repairMonitor.filters.apply')}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          onClick={handleReset}
          leftSection={<span className="material-symbols-outlined text-sm">clear</span>}
        >
          {t('repairMonitor.filters.reset')}
        </Button>
      </Group>
    </div>
  );
};

export default DashboardFilters;
