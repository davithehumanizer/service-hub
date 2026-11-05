import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../stores/globalStore';
import PageTitle from '../components/Typography/PageTitle';
import { Input, Label, Button } from '@windmill/react-ui';
import { authService } from '../services/authService';
import { updateProfile } from '../stores/authSlice';

function ProfileEdit() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const { user } = useSelector((state: RootState) => state.auth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.firstName || '');
      setLastName(user.profile.lastName || '');
      setPhone(user.profile.phone || '');
      setAddress(user.profile.address || '');
      setCity(user.profile.city || '');
      setCountry(user.profile.country || '');
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const updatedProfile = await authService.updateProfile(
        user.id, firstName, lastName, phone, address, city, country,
      );
      if (updatedProfile) {
        dispatch(updateProfile(updatedProfile));
        setSuccessMessage(t('profileEdit.successMessage'));
      }
    } catch (error: any) {
      setErrorMessage(error.message || t('profileEdit.errorMessage'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <PageTitle>{t('profileEdit.title')}</PageTitle>

      {/* Identity */}
      <div className="px-6 py-5 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
          {t('profileEdit.identity')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Label>
            <span>{t('profile.firstName')}</span>
            <Input
              className="mt-1"
              type="text"
              value={firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
              placeholder="Jean"
            />
          </Label>
          <Label>
            <span>{t('profile.lastName')}</span>
            <Input
              className="mt-1"
              type="text"
              value={lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
              placeholder="Dupont"
            />
          </Label>
        </div>
        <div className="mt-4">
          <Label>
            <span>{t('profile.phone')}</span>
            <Input
              className="mt-1"
              type="tel"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              placeholder="+32 470 000 000"
            />
          </Label>
        </div>
      </div>

      {/* Address */}
      <div className="px-6 py-5 mb-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-4">
          {t('profileEdit.location')}
        </h2>
        <div className="space-y-4">
          <Label>
            <span>{t('profile.address')}</span>
            <Input
              className="mt-1"
              type="text"
              value={address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              placeholder="Rue de la Paix 1"
            />
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Label>
              <span>{t('profile.city')}</span>
              <Input
                className="mt-1"
                type="text"
                value={city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                placeholder="Brussels"
              />
            </Label>
            <Label>
              <span>{t('profile.country')}</span>
              <Input
                className="mt-1"
                type="text"
                value={country}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value)}
                placeholder="Belgium"
              />
            </Label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? t('profileEdit.saving') : t('profileEdit.saveChanges')}
        </Button>
        <Button layout="outline" onClick={() => history.push('/app/profile')} disabled={isUpdating}>
          {t('profileEdit.cancel')}
        </Button>
        {successMessage && (
          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
            {successMessage}
          </span>
        )}
        {errorMessage && (
          <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
            {errorMessage}
          </span>
        )}
      </div>
    </>
  );
}

export default ProfileEdit;
