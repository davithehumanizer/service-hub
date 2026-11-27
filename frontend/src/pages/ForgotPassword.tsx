import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateError } from '../utils/errorTranslation';
import ImageLight from '../assets/img/forgot-password-office.jpeg';
import ImageDark from '../assets/img/forgot-password-office-dark.jpeg';
import { Label, Input, Button, HelperText } from '@windmill/react-ui';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { authService } from '../services/authService';
import { useNotification } from '../context/NotificationContext';

function ForgotPassword() {
  const { t } = useTranslation();
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.resetPasswordRequest(email);
      if (response.ok && response.data?.emailSent === false) {
        setError(t('auth.forgotPassword.notSent'));
        handleError(t('auth.forgotPassword.notSent'));
      } else if (response.ok) {
        setRequestSent(true);
      } else {
        setError(response.error || 'Failed to send reset link.');
        handleError(response.error);
      }
    } catch (err: any) {
      setError(translateError(err.message));
      handleError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error?:string) => {
    showNotification(error ?? 'An error occurred.', 'error');
  };

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
              <button
                onClick={() => history.push('/login')}
                className="flex items-center mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
                {t('auth.forgotPassword.backToLogin')}
              </button>
              <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
                {t('auth.forgotPassword.title')}
              </h1>

              {requestSent ? (
                <div className="text-center">
                  <p className="text-green-500">
                    {t('auth.forgotPassword.resetSent')}
                  </p>
                  <Link to="/login">
                    <Button className="mt-4" tag={"button"}>
                      {t('auth.forgotPassword.backToLogin')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit}>
                    <Label>
                      <span>{t('auth.forgotPassword.email')}</span>
                      <Input
                        className="mt-1"
                        placeholder="john@doe.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </Label>
                    {error && <HelperText valid={false} className="mt-2">{error}</HelperText>}
                    <Button
                      type="submit"
                      tag={"button"}
                      block
                      className="mt-4"
                      disabled={isLoading}
                    >
                      {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendResetLink')}
                    </Button>
                  </form>
                </>
                
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
