import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { Link } from 'react-router-dom';
import { RootState, AppDispatch } from '../stores/globalStore';
import { fetchAllStats, setFilters } from '../stores/repairMonitorSlice';
import { selectUserType } from '../stores/authSlice';
import { StatsFilter, repairMonitorService } from '../services/repairMonitorService';
import DashboardFilters from '../components/RepairMonitor/DashboardFilters';
import CategoryBarChart from '../components/RepairMonitor/CategoryBarChart';
import BrandBarChart from '../components/RepairMonitor/BrandBarChart';
import OutcomeDonutChart from '../components/RepairMonitor/OutcomeDonutChart';
import FailureReasonsChart from '../components/RepairMonitor/FailureReasonsChart';
import RepairsOverTimeChart from '../components/RepairMonitor/RepairsOverTimeChart';
import RepairRecordWizard from '../components/RepairMonitor/RepairRecordWizard/RepairRecordWizard';

type Tab = 'dashboard' | 'submit';

const RepairMonitorPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { stats, filters, loading, error } = useSelector((state: RootState) => state.repairMonitor);
  const userType = useSelector(selectUserType);
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = !!(token && userType && userType !== null);
  const isAdmin = userType === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchAllStats(filters));
  }, [dispatch, filters]);

  const handleFiltersChange = (newFilters: StatsFilter) => {
    dispatch(setFilters(newFilters));
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    setCsvMessage(null);

    try {
      const res = await repairMonitorService.importCsv(file);
      setCsvMessage(t('repairMonitor.importSuccess', { imported: res.imported, skipped: res.skipped }));
    } catch (err: any) {
      setCsvMessage(t('repairMonitor.importError', { message: err?.response?.data?.message || err.message }));
    } finally {
      setCsvImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalRepairs = stats.byOutcome.reduce((sum, d) => sum + (d.count || 0), 0);
  const fixedCount = stats.byOutcome.find((d) => d.repairStatus === 'Fixed')?.count || 0;
  const fixRate = totalRepairs > 0 ? Math.round((fixedCount / totalRepairs) * 100) : 0;

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <span className="material-symbols-outlined text-3xl text-teal-600 dark:text-teal-400 mr-3">monitoring</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('repairMonitor.title')}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('repairMonitor.subtitle')}
              </p>
            </div>
          </div>
          {isAdmin && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" id="csv-upload" />
              <Button
                component="label"
                htmlFor="csv-upload"
                loading={csvImporting}
                color="teal"
              >
                {t('repairMonitor.importCsv')}
              </Button>
            </>
          )}
        </div>

        {csvMessage && (
          <div className={`mt-4 rounded-xl p-3 text-sm ${csvMessage.startsWith('Import failed') ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' : 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300'}`}>
            {csvMessage}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
            activeTab === 'dashboard'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-teal-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">bar_chart</span>
            {t('repairMonitor.tabs.dashboard')}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
            activeTab === 'submit'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-teal-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {t('repairMonitor.tabs.submit')}
            {!isAuthenticated && (
              <span className="material-symbols-outlined text-xs text-amber-500">lock</span>
            )}
          </span>
        </button>
      </div>

      {/* ── Dashboard tab ──────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('repairMonitor.kpi.totalRepairs'), value: totalRepairs.toLocaleString(), icon: 'build_circle', color: 'text-teal-600 dark:text-teal-400', desc: t('repairMonitor.kpi.totalRepairsDesc') },
              { label: t('repairMonitor.kpi.fixRate'), value: `${fixRate}%`, icon: 'check_circle', color: 'text-teal-500 dark:text-teal-300', desc: t('repairMonitor.kpi.fixRateDesc') },
              { label: t('repairMonitor.kpi.categories'), value: stats.byCategory.length, icon: 'category', color: 'text-teal-700 dark:text-teal-300', desc: t('repairMonitor.kpi.categoriesDesc') },
              { label: t('repairMonitor.kpi.brands'), value: stats.byBrand.length, icon: 'store', color: 'text-teal-800 dark:text-teal-200', desc: t('repairMonitor.kpi.brandsDesc') },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <span className={`material-symbols-outlined text-3xl ${kpi.color}`}>{kpi.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{kpi.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <DashboardFilters value={filters} onChange={handleFiltersChange} />

          {error && (
            <div className="my-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl text-teal-600 dark:text-teal-400">category</span>
                {t('repairMonitor.charts.byCategory')}
              </h3>
              <CategoryBarChart data={stats.byCategory} loading={loading} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl text-teal-500 dark:text-teal-300">pie_chart</span>
                {t('repairMonitor.charts.outcomes')}
              </h3>
              <OutcomeDonutChart data={stats.byOutcome} loading={loading} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl text-teal-700 dark:text-teal-300">store</span>
                {t('repairMonitor.charts.topBrands')}
              </h3>
              <BrandBarChart data={stats.byBrand} loading={loading} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl text-teal-800 dark:text-teal-200">block</span>
                {t('repairMonitor.charts.failureReasons')}
              </h3>
              <FailureReasonsChart data={stats.failureReasons} loading={loading} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-xl text-teal-600 dark:text-teal-400">timeline</span>
                {t('repairMonitor.charts.overTime')}
              </h3>
              <RepairsOverTimeChart data={stats.overTime} loading={loading} />
            </div>
          </div>
        </>
      )}

      {/* ── Submit tab ─────────────────────────────────────────── */}
      {activeTab === 'submit' && (
        isAuthenticated ? (
          <RepairRecordWizard
            onSuccess={() => dispatch(fetchAllStats(filters))}
            onGoToDashboard={() => { dispatch(fetchAllStats(filters)); setActiveTab('dashboard'); }}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-teal-600 dark:text-teal-400">lock</span>
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {t('repairMonitor.loginToSubmit.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('repairMonitor.loginToSubmit.desc')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                component={Link}
                to="/login"
                color="teal"
                size="md"
                radius="xl"
                leftSection={<span className="material-symbols-outlined text-sm">login</span>}
              >
                {t('repairMonitor.loginToSubmit.loginBtn')}
              </Button>
              <Button
                component={Link}
                to="/create-account"
                variant="outline"
                color="teal"
                size="md"
                radius="xl"
                leftSection={<span className="material-symbols-outlined text-sm">person_add</span>}
              >
                {t('repairMonitor.loginToSubmit.createAccountBtn')}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default RepairMonitorPage;
