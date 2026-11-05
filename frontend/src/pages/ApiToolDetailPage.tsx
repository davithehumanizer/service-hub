import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button } from '@mantine/core';
import { apiCatalogService, ApiTool } from '../services/apiCatalogService';

const CATEGORY_COLORS: Record<string, string> = {
  recycling: 'green',
  repair: 'blue',
  diagnosis: 'orange',
  spare_parts: 'violet',
  certification: 'teal',
  other: 'gray',
};

const PRICING_COLORS: Record<string, string> = {
  free: 'green',
  freemium: 'yellow',
  paid: 'red',
  open_source: 'cyan',
  unknown: 'gray',
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-40 text-blue-700 dark:text-blue-300',
  POST: 'bg-green-100 dark:bg-green-900 dark:bg-opacity-40 text-green-700 dark:text-green-300',
  PUT: 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-40 text-yellow-700 dark:text-yellow-300',
  PATCH: 'bg-orange-100 dark:bg-orange-900 dark:bg-opacity-40 text-orange-700 dark:text-orange-300',
  DELETE: 'bg-red-100 dark:bg-red-900 dark:bg-opacity-40 text-red-700 dark:text-red-300',
};

const ApiToolDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const location = (history as any).location;
  const base = location.pathname.split('/').filter(Boolean).length
    ? `/${location.pathname.split('/').filter(Boolean)[0]}`
    : '';

  const [tool, setTool] = useState<ApiTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiCatalogService
      .getById(id)
      .then((data) => { if (mounted) setTool(data); })
      .catch(() => { if (mounted) setError('Tool not found or not accessible.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-4xl text-purple-500">progress_activity</span>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="w-full flex flex-col items-center py-20 px-4">
        <span className="material-symbols-outlined text-5xl text-red-400 block mb-3">error</span>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error ?? 'Tool not found.'}</p>
        <Button variant="default" onClick={() => history.push(`${base}/api-catalog`)}>
          Back to catalog
        </Button>
      </div>
    );
  }

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10 space-y-6">
      {/* Back */}
      <button
        onClick={() => history.push(`${base}/api-catalog`)}
        className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors w-fit"
      >
        <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
        {t('apiToolDetail.backToCatalog')}
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-start gap-4">
          {tool.logoUrl ? (
            <img
              src={tool.logoUrl}
              alt={`${tool.name} logo`}
              className="w-14 h-14 rounded-xl object-contain border border-gray-100 dark:border-gray-700 bg-white p-1 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-purple-500 text-2xl">hub</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tool.name}</h1>
              {tool.apiVersion && (
                <span className="text-sm text-gray-400 dark:text-gray-500">{tool.apiVersion}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {tool.isBuiltIn && (
                <Badge color="violet" size="sm" variant="filled">{t('apiToolDetail.integrated')}</Badge>
              )}
              <Badge color={CATEGORY_COLORS[tool.category] ?? 'gray'} size="sm" variant="light">
                {t(`apiCatalog.categories.${tool.category}`, { defaultValue: tool.category })}
              </Badge>
              <Badge color={PRICING_COLORS[tool.pricingModel] ?? 'gray'} size="sm" variant="outline">
                {t(`apiCatalog.pricing.${tool.pricingModel}`, { defaultValue: tool.pricingModel })}
              </Badge>
              {tool.isPubliclyAccessible && (
                <Badge color="green" size="sm" variant="dot">{t('apiToolDetail.publiclyAccessible')}</Badge>
              )}
              {tool.requiresApiKey && (
                <Badge color="orange" size="sm" variant="dot">{t('apiToolDetail.apiKeyRequired')}</Badge>
              )}
              {tool.requiresAccount && (
                <Badge color="violet" size="sm" variant="dot">{t('apiToolDetail.accountRequired')}</Badge>
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm">{tool.shortDescription}</p>
          </div>
        </div>

        {tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" color="violet" leftSection={<span className="material-symbols-outlined text-sm">open_in_new</span>}>
              {t('apiToolDetail.visitWebsite')}
            </Button>
          </a>
          {tool.documentationUrl && (
            <a href={tool.documentationUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" leftSection={<span className="material-symbols-outlined text-sm">menu_book</span>}>
                {t('apiToolDetail.documentation')}
              </Button>
            </a>
          )}
          {tool.swaggerUrl && (
            <a href={tool.swaggerUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" leftSection={<span className="material-symbols-outlined text-sm">code</span>}>
                {t('apiToolDetail.swaggerUI')}
              </Button>
            </a>
          )}
          {tool.openApiSpecUrl && (
            <a href={tool.openApiSpecUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" leftSection={<span className="material-symbols-outlined text-sm">description</span>}>
                {t('apiToolDetail.openApiSpec')}
              </Button>
            </a>
          )}
          {tool.pricingUrl && (
            <a href={tool.pricingUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" leftSection={<span className="material-symbols-outlined text-sm">payments</span>}>
                {t('apiToolDetail.pricing')}
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {tool.fullDescription && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('apiToolDetail.about')}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{tool.fullDescription}</p>
        </div>
      )}

      {/* Technical details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Access & Auth */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('apiToolDetail.accessAuth')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.authType')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{t(`apiCatalog.authTypes.${tool.authType}`, { defaultValue: tool.authType })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.publiclyAccessible')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{tool.isPubliclyAccessible ? t('common.yes') : t('common.no')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.accountRequired')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{tool.requiresAccount ? t('common.yes') : t('common.no')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.apiKeyRequired')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{tool.requiresApiKey ? t('common.yes') : t('common.no')}</dd>
            </div>
            {tool.baseApiUrl && (
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0">{t('apiToolDetail.baseUrl')}</dt>
                <dd className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{tool.baseApiUrl}</dd>
              </div>
            )}
          </dl>
          {tool.authDetails && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {tool.authDetails}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('apiToolDetail.pricing')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.model')}</dt>
              <dd>
                <Badge color={PRICING_COLORS[tool.pricingModel] ?? 'gray'} size="sm">
                  {t(`apiCatalog.pricing.${tool.pricingModel}`, { defaultValue: tool.pricingModel })}
                </Badge>
              </dd>
            </div>
            {tool.supportedFormats.length > 0 && (
              <div className="flex justify-between items-start">
                <dt className="text-gray-500 dark:text-gray-400">{t('apiToolDetail.formats')}</dt>
                <dd className="flex flex-wrap gap-1 justify-end">
                  {tool.supportedFormats.map((f) => (
                    <span key={f} className="text-xs uppercase font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                      {f}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {tool.pricingDetails && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {tool.pricingDetails}
            </div>
          )}
        </div>
      </div>

      {/* Endpoints */}
      {tool.endpoints.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('apiToolDetail.keyEndpoints')}</h2>
          <div className="space-y-2">
            {tool.endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 ${METHOD_COLORS[ep.method] ?? ''}`}>
                  {ep.method}
                </span>
                <code className="text-xs font-mono text-gray-700 dark:text-gray-200 flex-shrink-0">
                  {ep.path}
                </code>
                {ep.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    — {ep.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiToolDetailPage;
