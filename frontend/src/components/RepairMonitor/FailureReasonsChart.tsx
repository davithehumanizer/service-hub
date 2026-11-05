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
import { FailureReasonStat } from '../../services/repairMonitorService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);



interface Props {
  data: FailureReasonStat[];
  loading?: boolean;
}

const FailureReasonsChart: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  const BARRIER_LABELS: Record<string, string> = {
    // Enum keys (from wizard form)
    TooExpensive: t('repairMonitor.step3.barrierLabels.TooExpensive'),
    SparePartsUnavailable: t('repairMonitor.step3.barrierLabels.SparePartsUnavailable'),
    NoSkillsInfo: t('repairMonitor.step3.barrierLabels.NoSkillsInfo'),
    ProductDesign: t('repairMonitor.step3.barrierLabels.ProductDesign'),
    NoFaultFound: t('repairMonitor.step3.barrierLabels.NoFaultFound'),
    BeyondEconomicRepair: t('repairMonitor.step3.barrierLabels.BeyondEconomicRepair'),
    Other: t('repairMonitor.step3.barrierLabels.Other'),
    // CSV free-text values (Restart Project / iFixit format)
    'No way to fix the product': t('repairMonitor.step3.csvBarriers.NoWayToFix'),
    'Spare parts not available at repair session': t('repairMonitor.step3.csvBarriers.SparePartsNotAtSession'),
    'Unidentified failure': t('repairMonitor.step3.csvBarriers.UnidentifiedFailure'),
    'Too worn out': t('repairMonitor.step3.csvBarriers.TooWornOut'),
    'No way to open the product': t('repairMonitor.step3.csvBarriers.NoWayToOpen'),
    'Spare parts not available on the market': t('repairMonitor.step3.csvBarriers.SparePartsNotOnMarket'),
    'Spare parts too expensive': t('repairMonitor.step3.csvBarriers.SparePartsTooExpensive'),
    'Too time consuming': t('repairMonitor.step3.csvBarriers.TooTimeConsuming'),
    'Lack of equipment at repair location': t('repairMonitor.step3.csvBarriers.LackOfEquipment'),
    'Repair information not available': t('repairMonitor.step3.csvBarriers.RepairInfoNotAvailable'),
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
        <span className="material-symbols-outlined text-4xl">block</span>
        <span className="text-sm">{t('repairMonitor.charts.noData')}</span>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);

  // Horizontal bars, like CategoryBarChart/BrandBarChart: barrier labels are
  // long translated strings, and a vertical layout crowds them unreadably on
  // narrow screens. Height grows with item count, capped to avoid overflow.
  const chartHeight = Math.min(800, Math.max(200, sorted.length * 40));

  const chartData = {
    labels: sorted.map((d) => BARRIER_LABELS[d.repairBarrier] || d.repairBarrier || 'Unknown'),
    datasets: [
      {
        label: t('repairMonitor.charts.failures'),
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
    <div style={{ height: chartHeight }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default FailureReasonsChart;
