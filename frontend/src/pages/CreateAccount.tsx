import React, { useContext, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateError } from '../utils/errorTranslation';

import ImageLight from '../assets/img/create-account-office.jpeg';
import ImageDark from '../assets/img/create-account-office-dark.jpeg';
import { Input, Label, Button, HelperText } from '@windmill/react-ui';import { authService } from '../services/authService';
import { APIResponse } from '../models/api.response';
import { useNotification } from '../context/NotificationContext';
import { WindmillContext } from '@windmill/react-ui';
import { useMantineColorScheme, Select } from '@mantine/core';
import { MoonIcon, SunIcon } from '../icons';
import { readReturnTo, returnToSearch } from '../utils/returnTo';
import RecaptchaNotice from '../components/RecaptchaNotice';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
  { value: 'nl', label: 'NL' },
  { value: 'de', label: 'DE' },
];

type UserType = 'customer' | 'repairer';

function CreateAccount() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<0 | 1>(0);
  const [registered, setRegistered] = useState(false);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const history = useHistory();
  const location = useLocation();
  const { showNotification } = useNotification();

  // Handed over to the login page, so signing in lands back where the user
  // started rather than on the home page.
  const returnToQuery = returnToSearch(readReturnTo(location.search));
  const { mode, toggleMode } = useContext(WindmillContext);
  const { setColorScheme } = useMantineColorScheme();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  };

  const handleAgreeToPolicyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreeToPolicy(event.target.checked);
  };

  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    setStep(1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setRegistrationError('');
    setPasswordMatchError('');

    if (password !== confirmPassword) {
      setPasswordMatchError(t('auth.createAccount.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response : APIResponse = await authService.register(email, password, userType ?? 'customer');
      if (response && response.ok && response.data &&  response.data.user.id) {
        // Registration successful — the account still needs email confirmation
        // before login will work, so say so instead of sending them straight
        // to a login form that will otherwise fail with no explanation.
        setRegistered(true);
      } else {
        // Handle registration error
        setRegistrationError(translateError(response.error));
        handleError(response.error);
      }
    } catch (error: any) {
      setRegistrationError(translateError(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error?:string) => {
    showNotification(error ?? 'An error occurred.', 'error');
  };

  return (
    <div className="flex items-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <Select
          data={LANGUAGE_OPTIONS}
          value={i18n.language.slice(0, 2)}
          onChange={(val) => val && i18n.changeLanguage(val)}
          size="xs"
          w={64}
          aria-label={t('header.language')}
          comboboxProps={{ withinPortal: true }}
        />
        <button
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
          onClick={() => { setColorScheme(mode === 'dark' ? 'light' : 'dark'); toggleMode(); }}
          aria-label={t('header.toggleColorMode')}
        >
          {mode === 'dark' ? <SunIcon className="w-5 h-5" aria-hidden="true" /> : <MoonIcon className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>
      <div className="flex-1 h-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex flex-col overflow-y-auto md:flex-row">
          <div className="h-32 md:h-auto md:w-1/2">
            <img
              aria-hidden="true"
              className="object-cover w-full h-full dark:hidden"
              src={ImageLight}
              alt="Office"
            />
            <img
              aria-hidden="true"
              className="hidden object-cover w-full h-full dark:block"
              src={ImageDark}
              alt="Office"
            />
          </div>
          <main className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              {registered ? (
                <div>
                  <span className="material-symbols-outlined text-4xl text-customgreen-500 mb-4 block">mark_email_unread</span>
                  <h1 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {t('auth.createAccount.verifyEmail.title')}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {t('auth.createAccount.verifyEmail.desc', { email })}
                  </p>
                  <Link to={`/login${returnToQuery}`}>
                    <Button tag={"button"} block>
                      {t('auth.createAccount.verifyEmail.goToLogin')}
                    </Button>
                  </Link>
                </div>
              ) : step === 0 ? (
                <>
                  <h1 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {t('auth.createAccount.title')}
                  </h1>
                  <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    {t('auth.createAccount.howWillYouUse')}
                  </p>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => handleSelectUserType('customer')}
                      className="flex flex-col items-start p-5 border-2 border-gray-200 rounded-lg hover:border-customgreen-500 hover:bg-green-50 dark:border-gray-600 dark:hover:border-customgreen-400 dark:hover:bg-gray-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-customgreen-500"
                    >
                      <span className="material-symbols-outlined text-2xl text-customgreen-600 dark:text-customgreen-400 mb-2">person</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{t('auth.createAccount.customerType')}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.createAccount.customerTypeDesc')}</span>
                    </button>
                    <button
                      onClick={() => handleSelectUserType('repairer')}
                      className="flex flex-col items-start p-5 border-2 border-gray-200 rounded-lg hover:border-customgreen-500 hover:bg-green-50 dark:border-gray-600 dark:hover:border-customgreen-400 dark:hover:bg-gray-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-customgreen-500"
                    >
                      <span className="material-symbols-outlined text-2xl text-customgreen-600 dark:text-customgreen-400 mb-2">build</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{t('auth.createAccount.repairerType')}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.createAccount.repairerTypeDesc')}</span>
                    </button>
                  </div>
                  <p className="mt-6">
                    <Link
                      className="text-sm font-medium text-customgreen-600 dark:text-customgreen-400 hover:underline"
                      to={`/login${returnToQuery}`}
                    >
                      {t('auth.createAccount.alreadyAccount')} {t('auth.createAccount.loginHere')}
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStep(0)}
                    className="flex items-center mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
                    Back
                  </button>
                  <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {userType === 'repairer' ? t('auth.createAccount.title') : t('auth.createAccount.title')}
                  </h1>
                  <form onSubmit={handleSubmit}>
                    <Label>
                      <span>{t('auth.createAccount.email')}</span>
                      <Input
                        className="mt-1"
                        type="email"
                        placeholder="john@doe.com"
                        value={email}
                        onChange={handleEmailChange}
                        required
                      />
                    </Label>
                    <Label className="mt-4">
                      <span>{t('auth.createAccount.password')}</span>
                      <Input
                        className="mt-1"
                        placeholder="***************"
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                        required
                      />
                    </Label>
                    <Label className="mt-4">
                      <span>{t('auth.createAccount.confirmPassword')}</span>
                      <Input
                        className="mt-1"
                    placeholder="***************"
                    type="password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                  {passwordMatchError && (
                    <HelperText valid={false}>{passwordMatchError}</HelperText>
                  )}
                </Label>

                <Label className="mt-6" check>
                  <Input
                    type="checkbox"
                    checked={agreeToPolicy}
                    onChange={handleAgreeToPolicyChange}
                    required
                  />
                  <span className="ml-2">
                    {t('auth.createAccount.agreeToPolicy')} <span className="underline">{t('auth.createAccount.privacyPolicy')}</span>
                  </span>
                </Label>
                {registrationError && (
                  <HelperText valid={false} className="block mt-4">{registrationError}</HelperText>
                )}
                <Button type="submit" block className="mt-4" disabled={isLoading || !agreeToPolicy}>
                  {isLoading ? t('common.loading') : t('auth.createAccount.submit')}
                </Button>
                <RecaptchaNotice />
              </form>

              <hr className="my-8" />

              <p className="mt-4">
                <Link
                  className="text-sm font-medium text-customgreen-600 dark:text-customgreen-400 hover:underline"
                  to={`/login${returnToQuery}`}
                >
                  {t('auth.createAccount.alreadyAccount')} {t('auth.createAccount.loginHere')}
                </Link>
              </p>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;
