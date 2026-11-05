import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Redirect, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Button,
  Switch,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { RootState } from '../stores/globalStore';
import {
  apiCatalogService,
  SubmitApiToolPayload,
  ApiToolEndpoint,
} from '../services/apiCatalogService';

// Labels come from apiCatalog.<group>.<value> in the locales.
const CATEGORY_VALUES = ['recycling', 'repair', 'diagnosis', 'spare_parts', 'certification', 'other'];
const AUTH_TYPE_VALUES = ['none', 'api_key', 'oauth2', 'basic_auth', 'jwt', 'other'];
const PRICING_VALUES = ['free', 'freemium', 'paid', 'open_source', 'unknown'];

const FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'csv', label: 'CSV' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'rss', label: 'RSS' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const normalizeUrl = (url: string | undefined): string | undefined => {
  if (!url || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const initialForm: SubmitApiToolPayload = {
  name: '',
  shortDescription: '',
  fullDescription: '',
  websiteUrl: '',
  baseApiUrl: '',
  category: 'other',
  logoUrl: '',
  tags: [],
  isPubliclyAccessible: false,
  requiresAccount: false,
  requiresApiKey: false,
  authType: 'none',
  authDetails: '',
  pricingModel: 'unknown',
  pricingDetails: '',
  pricingUrl: '',
  documentationUrl: '',
  swaggerUrl: '',
  openApiSpecUrl: '',
  apiVersion: '',
  supportedFormats: [],
  endpoints: [],
};

const SubmitToolPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const guest = useSelector((state: RootState) => state.auth.guest);
  const history = useHistory();
  const location = (history as any).location;
  const base = location.pathname.split('/').filter(Boolean).length
    ? `/${location.pathname.split('/').filter(Boolean)[0]}`
    : '';

  const [form, setForm] = useState<SubmitApiToolPayload>(initialForm);
  const [tagInput, setTagInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (guest || !user) return <Redirect to="/login" />;

  const set = (key: keyof SubmitApiToolPayload, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const options = (values: string[], group: string) =>
    values.map((value) => ({ value, label: t(`apiCatalog.${group}.${value}`) }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags!.includes(t)) {
      set('tags', [...(form.tags ?? []), t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    set('tags', (form.tags ?? []).filter((t) => t !== tag));

  const addEndpoint = () => {
    set('endpoints', [
      ...(form.endpoints ?? []),
      { method: 'GET', path: '', description: '' },
    ]);
  };

  const updateEndpoint = (i: number, key: keyof ApiToolEndpoint, value: string) => {
    const updated = [...(form.endpoints ?? [])];
    updated[i] = { ...updated[i], [key]: value };
    set('endpoints', updated);
  };

  const removeEndpoint = (i: number) =>
    set('endpoints', (form.endpoints ?? []).filter((_, idx) => idx !== i));

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t('submitTool.nameRequired');
    if (!form.shortDescription.trim() || form.shortDescription.trim().length < 10)
      errors.shortDescription = t('submitTool.shortDescTooShort');
    if (form.shortDescription.length > 160)
      errors.shortDescription = t('submitTool.shortDescTooLong');
    if (!form.websiteUrl.trim()) errors.websiteUrl = t('submitTool.websiteRequired');
    if (!form.category) errors.category = t('submitTool.categoryRequired');
    if (!form.authType) errors.authType = t('submitTool.authTypeRequired');
    if (!form.pricingModel) errors.pricingModel = t('submitTool.pricingRequired');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      // Normalize URLs and strip empty optional strings
      const payload: SubmitApiToolPayload = {
        ...form,
        websiteUrl: normalizeUrl(form.websiteUrl) ?? form.websiteUrl,
        baseApiUrl: normalizeUrl(form.baseApiUrl),
        logoUrl: normalizeUrl(form.logoUrl),
        fullDescription: form.fullDescription || undefined,
        authDetails: form.authDetails || undefined,
        pricingDetails: form.pricingDetails || undefined,
        pricingUrl: normalizeUrl(form.pricingUrl),
        documentationUrl: normalizeUrl(form.documentationUrl),
        swaggerUrl: normalizeUrl(form.swaggerUrl),
        openApiSpecUrl: normalizeUrl(form.openApiSpecUrl),
        apiVersion: form.apiVersion || undefined,
        endpoints: (form.endpoints ?? []).filter((ep) => ep.path.trim()),
      };
      await apiCatalogService.submitTool(payload);
      setSuccess(true);
    } catch (err: any) {
      // The server's own message when it gives one; axios's ("Request failed
      // with status code 500") said nothing to a reader, and in English.
      setError(err?.response?.data?.message ?? t('submitTool.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full flex flex-col items-center py-20 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <span className="material-symbols-outlined text-5xl text-green-500 block mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('submitTool.successTitle')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('submitTool.successMessage')}
          </p>
          <Button color="blue" onClick={() => history.push(`${base}/api-catalog`)}>
            {t('submitTool.backToCatalog')}
          </Button>
        </div>
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
          <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400 mr-3">add_circle</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('submitTool.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('submitTool.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('submitTool.basicInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={t('submitTool.name')}
              required
              placeholder={t('submitTool.namePlaceholder')}
              value={form.name}
              onChange={(e) => set('name', e.currentTarget.value)}
              error={fieldErrors.name}
            />
            <Select
              label={t('submitTool.category')}
              required
              data={options(CATEGORY_VALUES, 'categories')}
              value={form.category}
              onChange={(v) => set('category', v ?? 'other')}
              error={fieldErrors.category}
            />
          </div>
          <div className="mt-4">
            <TextInput
              label={t('submitTool.shortDescription')}
              required
              placeholder={t('submitTool.shortDescPlaceholder')}
              value={form.shortDescription}
              maxLength={160}
              onChange={(e) => set('shortDescription', e.currentTarget.value)}
              error={fieldErrors.shortDescription}
              description={`${form.shortDescription.length}/160`}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label={t('submitTool.fullDescription')}
              placeholder={t('submitTool.fullDescPlaceholder')}
              value={form.fullDescription}
              minRows={3}
              onChange={(e) => set('fullDescription', e.currentTarget.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <TextInput
              label={t('submitTool.websiteUrl')}
              required
              placeholder="https://example.com"
              value={form.websiteUrl}
              onChange={(e) => set('websiteUrl', e.currentTarget.value)}
              error={fieldErrors.websiteUrl}
            />
            <TextInput
              label={t('submitTool.baseApiUrl')}
              placeholder="https://api.example.com/v1"
              value={form.baseApiUrl}
              onChange={(e) => set('baseApiUrl', e.currentTarget.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <TextInput
              label={t('submitTool.logoUrl')}
              placeholder="https://example.com/logo.png"
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.currentTarget.value)}
            />
            <TextInput
              label={t('submitTool.apiVersion')}
              placeholder={t('submitTool.versionPlaceholder')}
              value={form.apiVersion}
              onChange={(e) => set('apiVersion', e.currentTarget.value)}
            />
          </div>

          {/* Tags */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submitTool.tags')}</label>
            <div className="flex gap-2">
              <TextInput
                placeholder={t('submitTool.tagsPlaceholder')}
                value={tagInput}
                onChange={(e) => setTagInput(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="flex-1"
              />
              <Button variant="default" onClick={addTag} type="button">{t('submitTool.add')}</Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-purple-400 hover:text-red-500 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Access & Auth */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('submitTool.accessAuth')}</h2>
          <div className="flex flex-wrap gap-6 mb-4">
            <Switch
              label={t('submitTool.publiclyAccessible')}
              checked={form.isPubliclyAccessible}
              onChange={(e) => set('isPubliclyAccessible', e.currentTarget.checked)}
            />
            <Switch
              label={t('submitTool.requiresAccount')}
              checked={form.requiresAccount}
              onChange={(e) => set('requiresAccount', e.currentTarget.checked)}
            />
            <Switch
              label={t('submitTool.requiresApiKey')}
              checked={form.requiresApiKey}
              onChange={(e) => set('requiresApiKey', e.currentTarget.checked)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('submitTool.authType')}
              required
              data={options(AUTH_TYPE_VALUES, 'authTypes')}
              value={form.authType}
              onChange={(v) => set('authType', v ?? 'none')}
              error={fieldErrors.authType}
            />
          </div>
          {form.authType !== 'none' && (
            <div className="mt-4">
              <Textarea
                label={t('submitTool.authDetails')}
                placeholder={t('submitTool.authDetailsPlaceholder')}
                value={form.authDetails}
                minRows={2}
                onChange={(e) => set('authDetails', e.currentTarget.value)}
              />
            </div>
          )}
        </section>

        {/* Pricing */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('submitTool.pricingSection')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('submitTool.pricingModel')}
              required
              data={options(PRICING_VALUES, 'pricing')}
              value={form.pricingModel}
              onChange={(v) => set('pricingModel', v ?? 'unknown')}
              error={fieldErrors.pricingModel}
            />
            <TextInput
              label={t('submitTool.pricingPageUrl')}
              placeholder="https://example.com/pricing"
              value={form.pricingUrl}
              onChange={(e) => set('pricingUrl', e.currentTarget.value)}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label={t('submitTool.pricingDetails')}
              placeholder={t('submitTool.pricingDetailsPlaceholder')}
              value={form.pricingDetails}
              minRows={2}
              onChange={(e) => set('pricingDetails', e.currentTarget.value)}
            />
          </div>
        </section>

        {/* Documentation */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('submitTool.documentationSection')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={t('submitTool.documentationUrl')}
              placeholder="https://docs.example.com"
              value={form.documentationUrl}
              onChange={(e) => set('documentationUrl', e.currentTarget.value)}
            />
            <TextInput
              label={t('submitTool.swaggerUrl')}
              placeholder="https://api.example.com/swagger"
              value={form.swaggerUrl}
              onChange={(e) => set('swaggerUrl', e.currentTarget.value)}
            />
            <TextInput
              label={t('submitTool.openApiSpecUrl')}
              placeholder="https://api.example.com/openapi.json"
              value={form.openApiSpecUrl}
              onChange={(e) => set('openApiSpecUrl', e.currentTarget.value)}
            />
          </div>
          <div className="mt-4">
            <MultiSelect
              label={t('submitTool.supportedFormats')}
              data={FORMAT_OPTIONS}
              value={form.supportedFormats ?? []}
              onChange={(v) => set('supportedFormats', v)}
              placeholder={t('submitTool.selectFormats')}
            />
          </div>
        </section>

        {/* Endpoints */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('submitTool.keyEndpoints')}</h2>
            <Button variant="default" size="xs" type="button" onClick={addEndpoint} className="self-start sm:self-auto">
              {t('submitTool.addEndpoint')}
            </Button>
          </div>
          {(form.endpoints ?? []).length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('submitTool.noEndpoints')}</p>
          )}
          <div className="space-y-3">
            {(form.endpoints ?? []).map((ep, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                <Select
                  data={HTTP_METHODS}
                  value={ep.method}
                  onChange={(v) => updateEndpoint(i, 'method', v ?? 'GET')}
                  className="sm:w-28 sm:flex-shrink-0"
                />
                <TextInput
                  placeholder={t('submitTool.pathPlaceholder')}
                  value={ep.path}
                  onChange={(e) => updateEndpoint(i, 'path', e.currentTarget.value)}
                  className="flex-1 min-w-0"
                />
                <TextInput
                  placeholder={t('submitTool.descPlaceholder')}
                  value={ep.description}
                  onChange={(e) => updateEndpoint(i, 'description', e.currentTarget.value)}
                  className="flex-1 min-w-0"
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  type="button"
                  onClick={() => removeEndpoint(i)}
                  className="self-end sm:self-auto sm:mt-1"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </ActionIcon>
              </div>
            ))}
          </div>
        </section>

        {/* Submit */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            variant="default"
            type="button"
            onClick={() => history.push(`${base}/api-catalog`)}
          >
            {t('submitTool.cancel')}
          </Button>
          <Button color="violet" type="submit" loading={loading}>
            {t('submitTool.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitToolPage;
