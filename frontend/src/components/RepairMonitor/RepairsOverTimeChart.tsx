import React from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { TimeSeriesStat } from '../../services/repairMonitorService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  data: TimeSeriesStat[];
  loading?: boolean;
}

const RepairsOverTimeChart: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <span className="material-symbols-outlined animate-spin text-3xl text-teal-500">progress_activity</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">{t('repairMonitor.charts.loading')}</span>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
        <span className="material-symbols-outlined text-4xl">timeline</span>
        <span className="text-sm">{t('repairMonitor.charts.noData')}</span>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.period),
    datasets: [
      {
        label: 'Repairs',
        data: data.map((d) => d.count),
        borderColor: 'rgba(33, 145, 140, 1)',
        backgroundColor: 'rgba(33, 145, 140, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="h-72">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default RepairsOverTimeChart;
