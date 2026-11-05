import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Badge } from '@mantine/core';
import { selectUserType } from '../stores/authSlice';
import { repairerService } from '../services/repairerService';

interface RepairerReport {
  id: string;
  repairer_id: string;
  reason: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  repairer?: {
    repairer_id: string;
    name: string;
    address: string;
  };
}

const AdminRepairerReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const userType = useSelector(selectUserType);
  const history = useHistory();

  const [reports, setReports] = useState<RepairerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (userType !== null && userType !== 'admin') {
      history.replace('/app/home');
    }
  }, [userType, history]);

  useEffect(() => {
    if (userType !== 'admin') return;
    let mounted = true;
    setLoading(true);
    repairerService
      .listReports('pending')
      .then((data) => { if (mounted) setReports(data); })
      .catch(() => { if (mounted) setError(t('adminRepairerReports.loadError')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userType, t]);

  const handleReview = async (id: string, status: 'reviewed' | 'dismissed') => {
    setActionLoading(id + '-' + status);
    try {
      await repairerService.reviewReport(id, status);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError(t('adminRepairerReports.reviewError'));
    } finally {
      setActionLoading(null);
    }
  };

  if (userType === null) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-4xl text-purple-500">progress_activity</span>
      </div>
    );
  }

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
        <div className="flex items-center">
          <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400 mr-3">flag</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminRepairerReports.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('adminRepairerReports.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-4xl text-purple-500">progress_activity</span>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">done_all</span>
          {t('adminRepairerReports.noReports')}
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('adminRepairerReports.pendingReports', { count: reports.length })}
          </p>
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {report.repairer?.name ?? report.repairer_id}
                  </h2>
                  {report.repairer?.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{report.repairer.address}</p>
                  )}
                </div>
                <Badge color="yellow" size="sm" variant="filled">
                  {report.status}
                </Badge>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {report.reason || t('adminRepairerReports.noReason')}
              </p>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <strong>{t('adminRepairerReports.reportedOn')}:</strong>{' '}
                {new Date(report.createdAt).toLocaleDateString()}
              </p>

              <div className="flex gap-3">
                <Button
                  color="green"
                  size="sm"
                  loading={actionLoading === report.id + '-reviewed'}
                  disabled={!!actionLoading}
                  onClick={() => handleReview(report.id, 'reviewed')}
                  leftSection={<span className="material-symbols-outlined text-sm">check_circle</span>}
                >
                  {t('adminRepairerReports.markReviewed')}
                </Button>
                <Button
                  color="red"
                  variant="outline"
                  size="sm"
                  loading={actionLoading === report.id + '-dismissed'}
                  disabled={!!actionLoading}
                  onClick={() => handleReview(report.id, 'dismissed')}
                  leftSection={<span className="material-symbols-outlined text-sm">cancel</span>}
                >
                  {t('adminRepairerReports.dismiss')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRepairerReportsPage;
