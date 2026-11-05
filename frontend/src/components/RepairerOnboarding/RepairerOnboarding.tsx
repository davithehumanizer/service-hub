import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Button, Input, Label, Textarea, HelperText } from '@windmill/react-ui';
import type { AppDispatch, RootState } from '../../stores/globalStore';
import { updateProfile } from '../../stores/authSlice';
import { API_URL } from '../../utils/globals';
import api from '../../services/api';
import { isValidPhone, isValidWebsite, isValidVatNumber } from '../../utils/contactValidation';

const DEVICE_SPECIALTIES = [
  { key: 'Smartphones', labelKey: 'repairerSpecialties.smartphones' },
  { key: 'Tablets', labelKey: 'repairerSpecialties.tablets' },
  { key: 'Laptops', labelKey: 'repairerSpecialties.laptops' },
  { key: 'Desktops', labelKey: 'repairerSpecialties.desktops' },
  { key: 'Televisions', labelKey: 'repairerSpecialties.televisions' },
  { key: 'Washing machines', labelKey: 'repairerSpecialties.washing_machines' },
  { key: 'Refrigerators', labelKey: 'repairerSpecialties.refrigerators' },
  { key: 'Vacuum cleaners', labelKey: 'repairerSpecialties.vacuum_cleaners' },
  { key: 'Audio equipment', labelKey: 'repairerSpecialties.audio_equipment' },
  { key: 'Cameras', labelKey: 'repairerSpecialties.cameras' },
  { key: 'Game consoles', labelKey: 'repairerSpecialties.game_consoles' },
  { key: 'Small appliances', labelKey: 'repairerSpecialties.small_appliances' },
  { key: 'Power tools', labelKey: 'repairerSpecialties.power_tools' },
  { key: 'Bicycles / E-bikes', labelKey: 'repairerSpecialties.bicycles_ebikes' },
  { key: 'Other', labelKey: 'repairerSpecialties.other' },
];

const STEPS = [
  { labelKey: 'onboarding.repairer.workshopLabel', icon: 'store' },
  { labelKey: 'onboarding.repairer.specialtiesLabel', icon: 'build' },
  { labelKey: 'onboarding.repairer.contactLabel', icon: 'location_on' },
  { labelKey: 'onboarding.repairer.stepSummary', icon: 'check_circle' },
];

function RepairerOnboarding() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const user = useSelector((state: RootState) => state.auth.user);

  const [step, setStep] = useState(1);
  const [repairerType, setRepairerType] = useState<'individual' | 'professional'>('individual');
  const [businessName, setBusinessName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [description, setDescription] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  // A save that failed said nothing: the button came back and the step stayed.
  const [saveFailed, setSaveFailed] = useState(false);

  const [vatTouched, setVatTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [websiteTouched, setWebsiteTouched] = useState(false);

  const vatInvalid = repairerType === 'professional' && !isValidVatNumber(vatNumber);
  const phoneInvalid = !isValidPhone(phone);
  const websiteInvalid = !isValidWebsite(website);

  const toggleSpecialty = (name: string) => {
    setSpecialties((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await api.post(`${API_URL}/v1/users/me/repairer-profile`, {
      repairerType,
      businessName,
      vatNumber: repairerType === 'professional' ? vatNumber : undefined,
      description,
      deviceSpecialties: specialties,
      address,
      city,
      country,
      postalCode,
      phone,
      website,
    });
  };

  const handleFinish = async () => {
    if (!user) return;
    // Steps are freely revisitable from the sidebar, so a field can go back to
    // being invalid after Step 3's own check already passed once — check again
    // here, since this is what actually sends the data.
    if (vatInvalid) {
      setVatTouched(true);
      setStep(1);
      return;
    }
    if (phoneInvalid || websiteInvalid) {
      setPhoneTouched(true);
      setWebsiteTouched(true);
      setStep(3);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      await handleSaveProfile();
      await api.put(`${API_URL}/v1/users`, {
         userId: user.id,
        profile: { onboardingCompleted: true },
      });
      dispatch(updateProfile({ ...user.profile, onboardingCompleted: true }));
      history.replace('/app/home');
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length) setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left panel — step navigation */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-8 py-12 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-6">
          {t('onboarding.repairer.sectionLabel')}
        </p>

        <nav className="space-y-2">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const isDone = idx < step;
            const isActive = idx === step;
            const isClickable = isDone;
            return (
              <div
                key={s.labelKey}
                onClick={() => isClickable && setStep(idx)}
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

          {/* Step 1 — Workshop */}
          {step === 1 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">store</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.repairer.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.repairer.subtitle')}
              </p>

              {/* Repairer type selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {(['individual', 'professional'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRepairerType(type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors focus:outline-none ${
                      repairerType === type
                        ? 'border-customgreen-500 bg-customgreen-50 dark:bg-customgreen-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl flex-shrink-0 mt-0.5 ${
                      repairerType === type ? 'text-customgreen-600 dark:text-customgreen-400' : 'text-gray-400'
                    }`}>
                      {type === 'individual' ? 'handyman' : 'storefront'}
                    </span>
                    <div>
                      <p className={`font-semibold text-sm ${
                        repairerType === type ? 'text-customgreen-700 dark:text-customgreen-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {type === 'individual' ? t('onboarding.repairer.individual') : t('onboarding.repairer.professional')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {type === 'individual'
                          ? t('onboarding.repairer.individualDesc')
                          : t('onboarding.repairer.professionalDesc')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-5">
                <Label>
                  <span>{t('onboarding.repairer.workshopName')} <span className="text-red-500">*</span></span>
                  <Input
                    className="mt-1"
                    value={businessName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)}
                    placeholder={t('onboarding.repairer.workshopNamePlaceholder')}
                  />
                </Label>
                <Label>
                  <span>{t('onboarding.repairer.description')}</span>
                  <Textarea
                    className="mt-1"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    placeholder={t('onboarding.repairer.descriptionPlaceholder')}
                    rows={5}
                  />
                </Label>
                {repairerType === 'professional' && (
                  <Label>
                    <span>{t('onboarding.repairer.vatNumber')}</span>
                    <Input
                      className="mt-1"
                      value={vatNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVatNumber(e.target.value)}
                      onBlur={() => setVatTouched(true)}
                      valid={vatTouched && vatInvalid ? false : undefined}
                      placeholder={t('onboarding.repairer.vatPlaceholder')}
                    />
                    {vatTouched && vatInvalid && (
                      <HelperText valid={false}>{t('onboarding.repairer.vatInvalid')}</HelperText>
                    )}
                  </Label>
                )}
              </div>
              <div className="mt-8">
                <Button onClick={handleNext} disabled={!businessName.trim() || vatInvalid}>
                  {t('onboarding.repairer.continue')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Specialties */}
          {step === 2 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">build</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.repairer.whatDoYouRepair')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.repairer.selectCategories')}
              </p>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {DEVICE_SPECIALTIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleSpecialty(item.key)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors focus:outline-none ${
                      specialties.includes(item.key)
                        ? 'bg-customgreen-500 text-white border-customgreen-500'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-customgreen-400'
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button layout="outline" onClick={handleNext}>
                  {t('onboarding.repairer.skip')}
                </Button>
                <Button onClick={handleNext}>
                  {t('onboarding.repairer.continue')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Contact & location */}
          {step === 3 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">location_on</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.repairer.contactTitle')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.repairer.contactSubtitle')}
              </p>
              <div className="space-y-5">
                <Label>
                  <span>{t('onboarding.repairer.address')}</span>
                  <Input
                    className="mt-1"
                    value={address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                    placeholder="Rue de la Réparation 12"
                  />
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Label>
                      <span>{t('onboarding.repairer.city')}</span>
                      <Input
                        className="mt-1"
                        value={city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                        placeholder="Brussels"
                      />
                    </Label>
                  </div>
                  <Label>
                  <span>{t('onboarding.repairer.postalCode')}</span>
                    <Input
                      className="mt-1"
                      value={postalCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostalCode(e.target.value)}
                      placeholder="1000"
                    />
                  </Label>
                </div>
                <Label>
                  <span>{t('onboarding.repairer.country')}</span>
                  <Input
                    className="mt-1"
                    value={country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value)}
                    placeholder="Belgium"
                  />
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Label>
                    <span>{t('onboarding.repairer.phone')}</span>
                    <Input
                      className="mt-1"
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      valid={phoneTouched && phoneInvalid ? false : undefined}
                      placeholder="+32 2 000 00 00"
                    />
                    {phoneTouched && phoneInvalid && (
                      <HelperText valid={false}>{t('onboarding.repairer.phoneInvalid')}</HelperText>
                    )}
                  </Label>
                  <Label>
                    <span>{t('onboarding.repairer.website')}</span>
                    <Input
                      className="mt-1"
                      value={website}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsite(e.target.value)}
                      onBlur={() => setWebsiteTouched(true)}
                      valid={websiteTouched && websiteInvalid ? false : undefined}
                      placeholder="https://my-workshop.com"
                    />
                    {websiteTouched && websiteInvalid && (
                      <HelperText valid={false}>{t('onboarding.repairer.websiteInvalid')}</HelperText>
                    )}
                  </Label>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button
                  layout="outline"
                  onClick={() => { setPhoneTouched(true); setWebsiteTouched(true); if (!phoneInvalid && !websiteInvalid) handleNext(); }}
                  disabled={phoneInvalid || websiteInvalid}
                >
                  {t('onboarding.repairer.skip')}
                </Button>
                <Button
                  onClick={() => { setPhoneTouched(true); setWebsiteTouched(true); if (!phoneInvalid && !websiteInvalid) handleNext(); }}
                  disabled={phoneInvalid || websiteInvalid}
                >
                  {t('onboarding.repairer.continue')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Summary */}
          {step === 4 && (
            <div>
              <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">check_circle</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                {t('onboarding.repairer.summaryTitle')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {t('onboarding.repairer.summarySubtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('onboarding.repairer.workshopLabel')}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      repairerType === 'professional'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                        {repairerType === 'professional' ? 'storefront' : 'handyman'}
                      </span>
                      {repairerType === 'professional' ? t('onboarding.repairer.professional') : t('onboarding.repairer.individual')}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{businessName}</p>
                  {repairerType === 'professional' && vatNumber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('onboarding.repairer.vatLabel')}: {vatNumber}</p>
                  )}
                  {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{description}</p>}
                </div>

                {specialties.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">{t('onboarding.repairer.specialtiesLabel')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {specialties.map((s) => (
                        <span key={s} className="px-2.5 py-1 rounded-full text-xs bg-customgreen-50 dark:bg-customgreen-900/20 text-customgreen-700 dark:text-customgreen-300 border border-customgreen-200 dark:border-customgreen-800">
                          {t(DEVICE_SPECIALTIES.find(d => d.key === s)?.labelKey ?? s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(city || phone) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">{t('onboarding.repairer.contactLabel')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                      {address && <span className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>home</span>{address}</span>}
                      {(city || postalCode) && <span className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>location_city</span>{[city, postalCode].filter(Boolean).join(' ')}{country ? `, ${country}` : ''}</span>}
                      {phone && <span className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>phone</span>{phone}</span>}
                      {website && <span className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>language</span>{website}</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleFinish} disabled={saving}>
                  {saving ? t('onboarding.repairer.saving') : t('onboarding.repairer.confirmFinish')}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  {t('onboarding.repairer.editInformation')}
                </button>
              </div>
              {saveFailed && (
                <p
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300"
                >
                  <span className="material-symbols-outlined text-lg flex-shrink-0" aria-hidden="true">error</span>
                  {t('errors.saveFailed')}
                </p>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default RepairerOnboarding;