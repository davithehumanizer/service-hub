import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { CategoryStat } from '../../services/repairMonitorService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: CategoryStat[];
  loading?: boolean;
}

const CategoryBarChart: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  const CATEGORY_LABELS: Record<string, string> = {
    ElectricalItems: t('repairMonitor.step1.categories.ElectricalItems'),
    Clothing: t('repairMonitor.step1.categories.Clothing'),
    Furniture: t('repairMonitor.step1.categories.Furniture'),
    Bikes: t('repairMonitor.step1.categories.Bikes'),
    Computers: t('repairMonitor.step1.categories.Computers'),
    TV: t('repairMonitor.step1.categories.TV'),
    WhiteGoods: t('repairMonitor.step1.categories.WhiteGoods'),
    Tools: t('repairMonitor.step1.categories.Tools'),
    Toys: t('repairMonitor.step1.categories.Toys'),
    Phones: t('repairMonitor.step1.categories.Phones'),
    MusicInstruments: t('repairMonitor.step1.categories.MusicInstruments'),
    Other: t('repairMonitor.step1.categories.Other'),
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
        <span className="material-symbols-outlined text-4xl">bar_chart</span>
        <span className="text-sm">{t('repairMonitor.charts.noData')}</span>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 20);

  // Fit the chart height to the number of bars, capped to avoid canvas overflow
  const chartHeight = Math.min(800, Math.max(200, sorted.length * 40));

  const chartData = {
    labels: sorted.map((d) => CATEGORY_LABELS[d.category] || d.category || t('repairMonitor.step3.statuses.Unknown')),
    datasets: [
      {
        label: t('repairMonitor.charts.repairs'),
        data: sorted.map((d) => d.count),
        backgroundColor: 'rgba(33, 145, 140, 0.75)',
        borderColor: 'rgba(33, 145, 140, 1)',
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
      title: { display: false },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
      y: { ticks: { autoSkip: false } },
    },
  };

  return (
    <div style={{ height: chartHeight }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CategoryBarChart;
