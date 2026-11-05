import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Button, Input, Label, HelperText } from '@windmill/react-ui';
import type { AppDispatch, RootState } from '../../stores/globalStore';
import { updateProfile } from '../../stores/authSlice';
import { authService } from '../../services/authService';
import { API_URL } from '../../utils/globals';
import api from '../../services/api';
import { isValidPhone } from '../../utils/contactValidation';

const STEPS = [
  { labelKey: 'onboarding.customer.stepProfile', icon: 'person' },
  { labelKey: 'onboarding.customer.allSet', icon: 'check_circle' },
];

function CustomerOnboarding() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const user = useSelector((state: RootState) => state.auth.user);

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(user?.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.profile?.lastName ?? '');
  const [phone, setPhone] = useState(user?.profile?.phone ?? '');
  const [city, setCity] = useState(user?.profile?.city ?? '');
  const [country, setCountry] = useState(user?.profile?.country ?? '');
  const [saving, setSaving] = useState(false);
  // A save that failed said nothing: the button came back and the step stayed.
  const [saveFailed, setSaveFailed] = useState(false);

  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneInvalid = !isValidPhone(phone);

  const handleSaveProfile = async (): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setSaveFailed(false);
    try {
      await authService.updateProfile(user.id, firstName, lastName, phone, '', city, country);
      dispatch(updateProfile({ ...user.profile, firstName, lastName, phone, city, country }));
      return true;
    } catch {
      setSaveFailed(true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await api.put(`${API_URL}/v1/users`, {
        profile: { onboardingCompleted: true },
      });
      dispatch(updateProfile({ ...user.profile, onboardingCompleted: true }));
      history.replace('/app/wizard');
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      setPhoneTouched(true);
      if (phoneInvalid) return;
      if (!(await handleSaveProfile())) return;
    }
    if (step < STEPS.length) {
      setStep((s) => s + 1);
    }
  };

  // Skipping saved the form all the same, empty or not.
  const handleSkip = () => {
    setSaveFailed(false);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const saveError = saveFailed && (
    <p
      role="alert"
      className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300"
    >
      <span className="material-symbols-outlined text-lg flex-shrink-0" aria-hidden="true">error</span>
      {t('errors.saveFailed')}
    </p>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left panel — step navigation */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-8 py-12 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-6">
          {t('onboarding.customer.sectionLabel')}
        </p>

        <nav className="space-y-2">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const isDone = idx < step;
            const isActive = idx === step;
            return (
              <div
                key={s.labelKey}
                onClick={() => isDone && setStep(idx)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-customgreen-50 dark:bg-customgreen-900/20'
                    : isDone
                    ? 'opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                    : 'opacity-40'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isDone
                      ? 'bg-customgreen-500'
                      : isActive
                      ? 'border-2 border-customgreen-500'
                      : 'border-2 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>check</span>
                  ) : (
                    <span className={`text-xs font-bold ${isActive ? 'text-customgreen-600 dark:text-customgreen-400' : 'text-gray-400'}`}>{idx}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-customgreen-700 dark:text-customgreen-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t(s.labelKey)}
                </span>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{t('common.progress')}</span>
            <span>{Math.round((step / STEPS.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-customgreen-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((step / STEPS.length) * 100)}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile progress bar */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-200">{t(STEPS[step - 1].labelKey)}</span>
            <span>{t('wizard.step', { current: step, total: STEPS.length })}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-customgreen-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((step / STEPS.length) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex-1 px-6 py-10 sm:px-12 lg:px-16 xl:px-24 max-w-3xl w-full mx-auto">

          {/* Step 1 — Profile */}
          {step === 1 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">waving_hand</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.customer.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.customer.subtitle')}
              </p>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Label>
                    <span>{t('onboarding.customer.firstName')}</span>
                    <Input
                      className="mt-1"
                      value={firstName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                      placeholder="Jean"
                    />
                  </Label>
                  <Label>
                    <span>{t('onboarding.customer.lastName')}</span>
                    <Input
                      className="mt-1"
                      value={lastName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                      placeholder="Dupont"
                    />
                  </Label>
                </div>
                <Label>
                  <span>{t('onboarding.customer.phone')}</span>
                  <Input
                    className="mt-1"
                    value={phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                    onBlur={() => setPhoneTouched(true)}
                    valid={phoneTouched && phoneInvalid ? false : undefined}
                    placeholder="+32 470 000 000"
                  />
                  {phoneTouched && phoneInvalid && (
                    <HelperText valid={false}>{t('onboarding.customer.phoneInvalid')}</HelperText>
                  )}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Label>
                    <span>{t('onboarding.customer.city')}</span>
                    <Input
                      className="mt-1"
                      value={city}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                      placeholder="Brussels"
                    />
                  </Label>
                  <Label>
                    <span>{t('onboarding.customer.country')}</span>
                    <Input
                      className="mt-1"
                      value={country}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value)}
                      placeholder="Belgium"
                    />
                  </Label>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button layout="outline" onClick={handleSkip} disabled={saving}>
                  {t('onboarding.customer.skip')}
                </Button>
                <Button onClick={handleNext} disabled={saving || (phoneTouched && phoneInvalid)}>
                  {saving ? t('onboarding.customer.saving') : t('onboarding.customer.saveAndContinue')}
                </Button>
              </div>
              {saveError}
            </div>
          )}

          {/* Step 2 — All set */}
          {step === 2 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">check_circle</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.customer.allSet')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.customer.allSetDesc')}
              </p>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-8 flex items-start gap-4">
                <span className="material-symbols-outlined text-customgreen-500 text-3xl flex-shrink-0">route</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{t('onboarding.customer.repairJourney')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('onboarding.customer.repairJourneyDesc')}
                  </p>
                </div>
              </div>

              <Button onClick={handleFinish} disabled={saving}>
                {saving ? t('onboarding.customer.loading') : t('onboarding.customer.startRepairJourney')}
              </Button>
              {saveError}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default CustomerOnboarding;
