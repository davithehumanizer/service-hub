import React from 'react';
import { useTranslation } from 'react-i18next';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { OutcomeStat } from '../../services/repairMonitorService';

ChartJS.register(ArcElement, Tooltip, Legend);



// Viridis palette — color-blind friendly (yellow → green → teal → blue → purple)
const STATUS_COLORS: Record<string, string> = {
  Fixed: 'rgba(253, 231, 37, 0.85)',
  PartiallyFixed: 'rgba(94, 201, 98, 0.85)',
  Repairable: 'rgba(33, 145, 140, 0.85)',
  EndOfLife: 'rgba(68, 1, 84, 0.85)',
  Unknown: 'rgba(156, 163, 175, 0.85)',
  Other: 'rgba(59, 82, 139, 0.85)',
};

interface Props {
  data: OutcomeStat[];
  loading?: boolean;
}

const OutcomeDonutChart: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  const STATUS_LABELS: Record<string, string> = {
    Fixed: t('repairMonitor.step3.statuses.Fixed'),
    PartiallyFixed: t('repairMonitor.step3.statuses.PartiallyFixed'),
    Repairable: t('repairMonitor.step3.statuses.Repairable'),
    EndOfLife: t('repairMonitor.step3.statuses.EndOfLife'),
    Unknown: t('repairMonitor.step3.statuses.Unknown'),
    Other: t('repairMonitor.step3.statuses.Other'),
  };
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <span className="material-symbols-outlined animate-spin text-3xl text-customgreen-500">progress_activity</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">{t('repairMonitor.charts.loading')}</span>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
        <span className="material-symbols-outlined text-4xl">pie_chart</span>
        <span className="text-sm">{t('repairMonitor.charts.noData')}</span>
      </div>
    );
  }

  // Merge null/empty into 'Unknown'
  const normalized = Object.values(
    data.reduce<Record<string, OutcomeStat>>((acc, d) => {
      const key = d.repairStatus || 'Unknown';
      if (acc[key]) {
        acc[key] = { ...acc[key], count: acc[key].count + d.count };
      } else {
        acc[key] = { ...d, repairStatus: key };
      }
      return acc;
    }, {})
  );

  const chartData = {
    labels: normalized.map((d) => STATUS_LABELS[d.repairStatus] ?? STATUS_LABELS['Unknown']),
    datasets: [
      {
        data: normalized.map((d) => d.count),
        backgroundColor: normalized.map((d) => STATUS_COLORS[d.repairStatus] ?? STATUS_COLORS['Unknown']),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // 'right' squeezed the donut into a sliver on narrow mobile cards.
      legend: { position: 'bottom' as const },
    },
  };

  return (
    <div className="h-72">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default OutcomeDonutChart;
