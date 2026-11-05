import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { BrandStat } from '../../services/repairMonitorService';
import { useTranslation } from 'react-i18next';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: BrandStat[];
  loading?: boolean;
}

const BrandBarChart: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  const [hideUnknown, setHideUnknown] = useState(false);

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
        <span className="material-symbols-outlined text-4xl">store</span>
        <span className="text-sm">{t('repairMonitor.charts.noData')}</span>
      </div>
    );
  }

  const sorted = [...data]
    .filter((d) => !hideUnknown || (d.brand || '').toLowerCase() !== 'unknown')
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartHeight = Math.max(200, sorted.length * 36);

  const chartData = {
    labels: sorted.map((d) => d.brand || 'Unknown'),
    datasets: [
      {
        label: 'Repairs',
        data: sorted.map((d) => d.count),
        backgroundColor: 'rgba(59, 82, 139, 0.75)',
        borderColor: 'rgba(59, 82, 139, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
      y: { ticks: { autoSkip: false } },
    },
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setHideUnknown((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            hideUnknown
              ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {hideUnknown ? 'visibility_off' : 'visibility'}
          </span>
          {hideUnknown ? t('repairMonitor.charts.showUnknown') : t('repairMonitor.charts.hideUnknown')}
        </button>
      </div>
      <div style={{ height: chartHeight }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default BrandBarChart;
