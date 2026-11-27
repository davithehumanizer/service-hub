import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Select, TextInput } from '@mantine/core';
import { selectUserType } from '../stores/authSlice';
import { Contributor, contributorService } from '../services/contributorService';

// Native names: whoever reads the list knows their own language's.
export const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
];

/**
 * The accounts of the companies paid to enter demonstration data
 * (docs/demo-data.md): an administrator opens one per company, and the
 * company chooses its password from the link emailed.
 */
const AdminContributorsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const userType = useSelector(selectUserType);
  const history = useHistory();

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [locale, setLocale] = useState(
    LANGUAGES.some((l) => l.value === i18n.language.slice(0, 2)) ? i18n.language.slice(0, 2) : 'en',
  );
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (userType !== null && userType !== 'admin') {
      history.replace('/app/home');
    }
  }, [userType, history]);

  useEffect(() => {
    if (userType !== 'admin') return;
    let mounted = true;
    setLoading(true);
    contributorService
      .list()
      .then((data) => { if (mounted) setContributors(data); })
      .catch(() => { if (mounted) setError(t('adminContributors.loadError')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userType, t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setNotice(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setEmailError(t('adminContributors.emailInvalid'));
      return;
    }
    setEmailError(null);
    setSaving(true);
    try {
      const created = await contributorService.create({
        email: address,
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        locale,
      });
      setContributors((prev) => [created, ...prev]);
      if (created.invitationSent) {
        setNotice(t('adminContributors.created', { email: address }));
      } else {
        setError(t('adminContributors.createdNoInvitation', { email: address }));
      }
      setEmail('');
      setFirstName('');
      setLastName('');
    } catch (err) {
      setError(
        err === 'USER_ALREADY_EXISTS'
          ? t('adminContributors.alreadyExists')
          : t('adminContributors.createError'),
      );
    } finally {
      setSaving(false);
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
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center">
          <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400 mr-3">group_add</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('adminContributors.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('adminContributors.subtitle')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl p-4 text-sm">
          {notice}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('adminContributors.newAccount')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('adminContributors.invitationHint')}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <TextInput
            label={t('adminContributors.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={emailError}
            withAsterisk
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
              label={t('adminContributors.firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              maxLength={100}
            />
            <TextInput
              label={t('adminContributors.lastName')}
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              maxLength={100}
            />
          </div>
          <Select
            label={t('adminContributors.language')}
            description={t('adminContributors.languageHint')}
            data={LANGUAGES}
            value={locale}
            onChange={(value) => value && setLocale(value)}
            allowDeselect={false}
          />
          <Button type="submit" color="red" loading={saving}>
            {t('adminContributors.create')}
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('adminContributors.accounts')}</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-4xl text-purple-500">progress_activity</span>
          </div>
        ) : contributors.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('adminContributors.none')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {contributors.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/app/admin/contributors/${c.id}`}
                  className="-mx-2 px-2 py-3 flex flex-wrap items-center justify-between gap-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{c.email}</p>
                    {(c.profile?.firstName || c.profile?.lastName) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {[c.profile?.firstName, c.profile?.lastName].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                  <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('adminContributors.createdOn')} {new Date(c.created_at).toLocaleDateString(i18n.language)}
                    <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminContributorsPage;
