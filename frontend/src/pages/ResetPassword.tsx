import { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateError } from '../utils/errorTranslation';
import { Label, Input, Button, HelperText } from '@windmill/react-ui';
import { authService } from '../services/authService';
import ImageLight from '../assets/img/forgot-password-office.jpeg';
import ImageDark from '../assets/img/forgot-password-office-dark.jpeg';

function ResetPassword() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const history = useHistory();
  
  const [email, setEmail] = useState('');
  
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsResetting(true);
    setResetError('');
    setPasswordMatchError('');

    if (password !== confirmPassword) {
      setPasswordMatchError(t('auth.resetPassword.passwordMismatch'));
      setIsResetting(false);
      return;
    }

    try {
      const response = await authService.resetPassword(token, password, email);
      if (response.ok) {
        setResetSuccess(true);
      } else {
        setResetError(translateError(response.error));
      }
    } catch (error: any) {
      setResetError(translateError(error.message));
    } finally {
      setIsResetting(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-green-500">{t('auth.resetPassword.success')}</p>
          <Button className="mt-4" onClick={() => history.push('/login')}>
            {t('auth.resetPassword.goToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
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
            <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
              {t('auth.resetPassword.title')}
            </h1>
            <form onSubmit={handleSubmit}>
                <Label className="mt-4">
                <span>{t('auth.resetPassword.email')}</span>
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
                <span>{t('auth.resetPassword.newPassword')}</span>
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
                <span>{t('auth.resetPassword.confirmNewPassword')}</span>
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
              {resetError && (
                <HelperText valid={false} className="block mt-4">{resetError}</HelperText>
              )}
              <Button type="submit" block className="mt-4" disabled={isResetting}>
                {isResetting ? t('auth.resetPassword.resetting') : t('auth.resetPassword.submit')}
              </Button>
            </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
