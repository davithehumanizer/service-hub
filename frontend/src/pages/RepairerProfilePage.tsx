import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Textarea, HelperText } from '@windmill/react-ui';
import PageTitle from '../components/Typography/PageTitle';
import { RootState } from '../stores/globalStore';
import { API_URL } from '../utils/globals';
import api from '../services/api';
import { isValidPhone, isValidWebsite, isValidVatNumber } from '../utils/contactValidation';

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

interface RepairerProfileData {
  businessName: string;
  description: string;
  repairerType: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  phone: string;
  website: string;
  deviceSpecialties: string[];
}

function RepairerProfilePage() {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [repairerType, setRepairerType] = useState<'individual' | 'professional'>('individual');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [vatTouched, setVatTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [websiteTouched, setWebsiteTouched] = useState(false);

  const vatInvalid = repairerType === 'professional' && !isValidVatNumber(vatNumber);
  const phoneInvalid = !isValidPhone(phone);
  const websiteInvalid = !isValidWebsite(website);

  useEffect(() => {
    if (!user) return;
    api.get(`${API_URL}/v1/users/me/repairer-profile`)
      .then((res) => {
        const data: RepairerProfileData = res.data;
        setBusinessName(data.businessName || '');
        setDescription(data.description || '');
        setRepairerType((data.repairerType as 'individual' | 'professional') || 'individual');
        setVatNumber(data.vatNumber || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setCountry(data.country || '');
        setPostalCode(data.postalCode || '');
        setPhone(data.phone || '');
        setWebsite(data.website || '');
        setSpecialties(data.deviceSpecialties || []);
        setExists(true);
      })
      .catch(() => {
        setExists(false);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const toggleSpecialty = (name: string) => {
    setSpecialties((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const handleSave = async () => {
    if (!user) return;
    if (vatInvalid || phoneInvalid || websiteInvalid) {
      setVatTouched(true);
      setPhoneTouched(true);
      setWebsiteTouched(true);
      return;
    }
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    const payload = { repairerType, businessName, vatNumber: repairerType === 'professional' ? vatNumber : undefined, description, address, city, country, postalCode, phone, website, deviceSpecialties: specialties };
    try {
      if (exists) {
        await api.put(`${API_URL}/v1/users/me/repairer-profile`, payload);
      } else {
        await api.post(`${API_URL}/v1/users/me/repairer-profile`, payload);
        setExists(true);
      }
      setSuccessMessage(t('repairerProfile.success'));
    } catch {
      setErrorMessage(t('repairerProfile.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageTitle>{t('repairerProfile.title')}</PageTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('repairerProfile.loading')}</p>
      </>
    );
  }

  return (
    <>
      <PageTitle>{t('repairerProfile.title')}</PageTitle>

      <div className="px-4 py-5 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('repairerProfile.workshopInfo')}</h2>

        {/* Repairer type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
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
                  {type === 'individual' ? t('repairerProfile.individual') : t('repairerProfile.professional')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {type === 'individual'
                    ? t('repairerProfile.individualDesc')
                    : t('repairerProfile.professionalDesc')}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Label>
            <span>{t('repairerProfile.workshopName')} <span className="text-red-500">*</span></span>
            <Input
              className="mt-1"
              value={businessName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)}
              placeholder="e.g. Fix & Go Brussels"
            />
          </Label>

          <Label>
            <span>{t('repairerProfile.description')}</span>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder={t('repairerProfile.descriptionPlaceholder')}
              rows={3}
            />
          </Label>

          {repairerType === 'professional' && (
            <Label>
              <span>{t('repairerProfile.vatNumber')}</span>
              <Input
                className="mt-1"
                value={vatNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVatNumber(e.target.value)}
                onBlur={() => setVatTouched(true)}
                valid={vatTouched && vatInvalid ? false : undefined}
                placeholder="e.g. BE0123456789"
              />
              {vatTouched && vatInvalid && (
                <HelperText valid={false}>{t('repairerProfile.vatInvalid')}</HelperText>
              )}
            </Label>
          )}
        </div>
      </div>

      <div className="px-4 py-5 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('repairerProfile.deviceSpecialties')}</h2>
        <div className="flex flex-wrap gap-2">
          {DEVICE_SPECIALTIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSpecialty(item.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors focus:outline-none ${
                specialties.includes(item.key)
                  ? 'bg-customgreen-500 text-white border-customgreen-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-customgreen-400'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('repairerProfile.contactAndLocation')}</h2>

        <div className="space-y-4">
          <Label>
            <span>{t('profile.address')}</span>
            <Input
              className="mt-1"
              value={address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              placeholder="Rue de la Réparation 12"
            />
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Label>
              <span>{t('profile.city')}</span>
              <Input
                className="mt-1"
                value={city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                placeholder="Brussels"
              />
            </Label>
            <Label>
              <span>{t('profileEdit.postalCode')}</span>
              <Input
                className="mt-1"
                value={postalCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostalCode(e.target.value)}
                placeholder="1000"
              />
            </Label>
          </div>

          <Label>
            <span>{t('profile.country')}</span>
            <Input
              className="mt-1"
              value={country}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value)}
              placeholder="Belgium"
            />
          </Label>

          <Label>
            <span>{t('profile.phone')}</span>
            <Input
              className="mt-1"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              valid={phoneTouched && phoneInvalid ? false : undefined}
              placeholder="+32 2 000 00 00"
            />
            {phoneTouched && phoneInvalid && (
              <HelperText valid={false}>{t('repairerProfile.phoneInvalid')}</HelperText>
            )}
          </Label>

          <Label>
            <span>{t('profileEdit.website')}</span>
            <Input
              className="mt-1"
              value={website}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsite(e.target.value)}
              onBlur={() => setWebsiteTouched(true)}
              valid={websiteTouched && websiteInvalid ? false : undefined}
              placeholder="https://my-workshop.com"
            />
            {websiteTouched && websiteInvalid && (
              <HelperText valid={false}>{t('repairerProfile.websiteInvalid')}</HelperText>
            )}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || !businessName.trim() || (vatTouched && vatInvalid) || (phoneTouched && phoneInvalid) || (websiteTouched && websiteInvalid)}
        >
          {saving ? t('repairerProfile.saving') : t('repairerProfile.saveChanges')}
        </Button>
        {successMessage && <HelperText valid={true}>{successMessage}</HelperText>}
        {errorMessage && <HelperText valid={false}>{errorMessage}</HelperText>}
      </div>
    </>
  );
}

export default RepairerProfilePage;
