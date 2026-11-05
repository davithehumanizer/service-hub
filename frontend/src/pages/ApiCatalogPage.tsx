import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Badge, Button, TextInput } from '@mantine/core';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { RootState } from '../stores/globalStore';
import { apiCatalogService, ApiTool } from '../services/apiCatalogService';
import { returnToSearch } from '../utils/returnTo';

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

const ALL_CATEGORIES = ['all', ...Object.keys(CATEGORY_COLORS)];

const ApiCatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const guest = useSelector((state: RootState) => state.auth.guest);
  const history = useHistory();
  const location = (history as any).location;
  const base = location.pathname.split('/').filter(Boolean).length
    ? `/${location.pathname.split('/').filter(Boolean)[0]}`
    : '';

  const [tools, setTools] = useState<ApiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [integratedOnly, setIntegratedOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiCatalogService
      .listApproved()
      .then((data) => { if (mounted) setTools(data); })
      .catch(() => { if (mounted) setError(t('apiCatalog.loadError')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = tools.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesIntegrated = !integratedOnly || t.isBuiltIn;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesIntegrated && matchesSearch;
  });
  const query = search.trim();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchRef.current?.blur();
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400 mr-3">hub</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('apiCatalog.title')}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('apiCatalog.subtitle')}
              </p>
            </div>
          </div>
          {!guest && (
            <Button
              color="violet"
              leftSection={<span className="material-symbols-outlined text-sm">add_circle</span>}
              onClick={() => history.push(`${base}/submit-tool`)}
              className="self-start sm:self-auto"
            >
              {t('apiCatalog.submitTool')}
            </Button>
          )}
        </div>
      </div>

      {/* Guest notice */}
      {guest && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0">info</span>
          <div className="text-sm text-purple-800 dark:text-purple-300">
            <span className="font-semibold">{t('apiCatalog.signInNotice')}</span>{' '}
            {t('apiCatalog.signInDesc')}{' '}
            <button
              onClick={() => history.push(`/login${returnToSearch(`${base}/api-catalog`)}`)}
              className="underline font-medium hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
            >
              {t('apiCatalog.signIn')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg mb-6 space-y-3">
        {/* The list filters as one types; validating closes a phone's
            keyboard, which hid the results, and brings them into view. */}
        <form role="search" onSubmit={submitSearch}>
          <TextInput
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            placeholder={t('apiCatalog.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSectionPointerEvents="all"
            rightSection={
              <ActionIcon type="submit" variant="subtle" color="violet" aria-label={t('apiCatalog.searchSubmit')}>
                <MagnifyingGlassIcon className="w-4 h-4" />
              </ActionIcon>
            }
          />
        </form>
        <div className="flex flex-wrap gap-2 items-center">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 ${
                activeCategory === cat
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              {cat === 'all' ? t('apiCatalog.filterAll') : t(`apiCatalog.categories.${cat}`)}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => setIntegratedOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 ${
                integratedOnly
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-violet-400'
              }`}
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              {t('apiCatalog.integratedOnly')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-4xl text-purple-500">progress_activity</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <p ref={resultsRef} aria-live="polite" className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {query && !loading && !error && filtered.length > 0
          ? t('apiCatalog.resultCount', { count: filtered.length })
          : ''}
      </p>

      {/* A search here is often for a device or a part, which this catalogue
          does not hold: say so, and send the words where they can be found. */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">search_off</span>
          {query ? (
            <>
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {t('apiCatalog.noMatch', { query })}
              </p>
              <p className="mt-2 text-sm max-w-md mx-auto">{t('apiCatalog.noMatchWhat')}</p>
              <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<span className="material-symbols-outlined text-base">devices</span>}
                  onClick={() => history.push(`${base}/devices?q=${encodeURIComponent(query)}&extended=1`)}
                >
                  {t('apiCatalog.findDevice')}
                </Button>
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<span className="material-symbols-outlined text-base">build_circle</span>}
                  onClick={() => history.push(`${base}/spare-parts?q=${encodeURIComponent(query)}`)}
                >
                  {t('apiCatalog.findPart')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>{t('apiCatalog.noTools')}</p>
              {!guest && (
                <button
                  className="mt-2 text-purple-600 dark:text-purple-400 underline"
                  onClick={() => history.push(`${base}/submit-tool`)}
                >
                  {t('apiCatalog.submitTool')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((tool) => (
            <div
              key={tool.id}
              onClick={() => history.push(`${base}/api-catalog/${tool.id}`)}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border p-5 flex flex-col cursor-pointer hover:shadow-xl transition-all duration-200 ${tool.isBuiltIn ? 'border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500' : 'border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}`}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 mb-3">
                {tool.logoUrl ? (
                  <img
                    src={tool.logoUrl}
                    alt={`${tool.name} logo`}
                    className="w-10 h-10 rounded-lg object-contain border border-gray-100 dark:border-gray-700 bg-white p-1"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-500 text-xl">hub</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{tool.name}</h2>
                  {tool.apiVersion && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{tool.apiVersion}</span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">
                {tool.shortDescription}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {tool.isBuiltIn && (
                  <Badge color="violet" size="sm" variant="filled">{t('apiToolDetail.integrated')}</Badge>
                )}
                {tool.isCommunity && (
                  <Badge color="teal" size="sm" variant="filled">{t('apiCatalog.communityBadge')}</Badge>
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
              </div>

              <a
                href={tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline truncate"
              >
                {tool.websiteUrl}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiCatalogPage;
