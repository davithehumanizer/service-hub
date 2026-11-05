import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Badge, Textarea, Checkbox } from '@mantine/core';
import { RootState } from '../stores/globalStore';
import { selectUserType } from '../stores/authSlice';
import { apiCatalogService, ApiTool } from '../services/apiCatalogService';

const CATEGORY_LABELS: Record<string, string> = {
  recycling: 'Recycling',
  repair: 'Repair',
  diagnosis: 'Diagnosis',
  spare_parts: 'Spare Parts',
  certification: 'Certification',
  other: 'Other',
};

const AdminApiCatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const userType = useSelector(selectUserType);
  const history = useHistory();

  const [tools, setTools] = useState<ApiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [communityFlags, setCommunityFlags] = useState<Record<string, boolean>>({});

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
    apiCatalogService
      .listPending()
      .then((data) => {
        if (mounted) {
          setTools(data);
          setCommunityFlags(
            data.reduce((acc, tool) => ({ ...acc, [tool.id]: true }), {} as Record<string, boolean>),
          );
        }
      })
      .catch(() => { if (mounted) setError('Failed to load pending submissions.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userType]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await apiCatalogService.approveTool(id, communityFlags[id] ?? true);
      setTools((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to approve tool.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      const reason = rejectionReasons[id] ?? '';
      await apiCatalogService.rejectTool(id, reason || undefined);
      setTools((prev) => prev.filter((t) => t.id !== id));
      setShowRejectInput(null);
    } catch {
      setError('Failed to reject tool.');
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
          <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400 mr-3">admin_panel_settings</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminApiCatalog.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('adminApiCatalog.subtitle')}
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

      {!loading && tools.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">done_all</span>
          {t('adminApiCatalog.noSubmissions')}
        </div>
      )}

      {!loading && tools.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
          {tools.length} {t('adminApiCatalog.pendingSubmissions', { count: tools.length })}
          </p>
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  {tool.logoUrl ? (
                    <img
                      src={tool.logoUrl}
                      alt={`${tool.name} logo`}
                      className="w-10 h-10 rounded-lg object-contain border border-gray-100 dark:border-gray-700 bg-white p-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-purple-500 text-xl">hub</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">{tool.name}</h2>
                    <a
                      href={tool.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline truncate block"
                    >
                      {tool.websiteUrl}
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <Badge color="violet" size="sm" variant="light">
                    {CATEGORY_LABELS[tool.category] ?? tool.category}
                  </Badge>
                  <Badge color="yellow" size="sm" variant="filled">pending</Badge>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{tool.shortDescription}</p>

              {tool.fullDescription && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">
                  {tool.fullDescription}
                </p>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span><strong>Pricing:</strong> {tool.pricingModel}</span>
                <span><strong>Auth:</strong> {tool.authType}</span>
                <span><strong>Public:</strong> {tool.isPubliclyAccessible ? 'Yes' : 'No'}</span>
                <span><strong>Submitted:</strong> {new Date(tool.createdAt).toLocaleDateString()}</span>
              </div>

              {tool.documentationUrl && (
                <a
                  href={tool.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline mr-4"
                >
                  Documentation
                </a>
              )}
              {tool.swaggerUrl && (
                <a
                  href={tool.swaggerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Swagger UI
                </a>
              )}

              {/* Reject reason input */}
              {showRejectInput === tool.id && (
                <div className="mt-3">
                  <Textarea
                    placeholder={t('adminApiCatalog.rejectionReason')}
                    value={rejectionReasons[tool.id] ?? ''}
                    onChange={(e) =>
                      setRejectionReasons((prev) => ({ ...prev, [tool.id]: e.currentTarget.value }))
                    }
                    minRows={2}
                    autosize
                  />
                </div>
              )}

              {/* Community contribution flag */}
              <div className="mt-3">
                <Checkbox
                  label={t('adminApiCatalog.communityContribution')}
                  checked={communityFlags[tool.id] ?? true}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setCommunityFlags((prev) => ({ ...prev, [tool.id]: checked }));
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <Button
                  color="green"
                  size="sm"
                  loading={actionLoading === tool.id + '-approve'}
                  disabled={!!actionLoading}
                  onClick={() => handleApprove(tool.id)}
                  leftSection={<span className="material-symbols-outlined text-sm">check_circle</span>}
                >
                  {t('adminApiCatalog.approve')}
                </Button>
                {showRejectInput !== tool.id ? (
                  <Button
                    color="red"
                    variant="outline"
                    size="sm"
                    disabled={!!actionLoading}
                    onClick={() => setShowRejectInput(tool.id)}
                    leftSection={<span className="material-symbols-outlined text-sm">cancel</span>}
                  >
                    {t('adminApiCatalog.reject')}
                  </Button>
                ) : (
                  <>
                    <Button
                      color="red"
                      size="sm"
                      loading={actionLoading === tool.id + '-reject'}
                      disabled={!!actionLoading}
                      onClick={() => handleReject(tool.id)}
                    >
                      {t('adminApiCatalog.confirmReject')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={!!actionLoading}
                      onClick={() => setShowRejectInput(null)}
                    >
                      {t('adminApiCatalog.cancel')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApiCatalogPage;
