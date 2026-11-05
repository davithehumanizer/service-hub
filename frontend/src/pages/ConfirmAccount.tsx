import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ImageLight from '../assets/img/forgot-password-office.jpeg'
import ImageDark from '../assets/img/forgot-password-office-dark.jpeg'
import { authService } from '../services/authService';
import { Button } from '@windmill/react-ui';


const ConfirmAccount = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  useEffect(() => {
    const confirm = async () => {
      try {
        const response = await authService.confirmAccount(token);

        if (response.ok) {
          const {data} = response;
          setMessage(data.message);
          setIsError(false);
        } else {
          const {error} = response;
          setMessage(error || 'Failed to confirm account');
          setIsError(true);
        }
      } catch (error : any) {
        console.log(error)
        setMessage('An error occurred while confirming your account.');
        setIsError(true);
        setIsError(true);
      }
    };

    if (token) {
      confirm();
    }
  }, [token]);

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
                {t('auth.confirmAccount.title')}
              </h1>
              {
                message && (
                    <>
                        <p className='dark:text-customgreen'>{message}</p>
                        <Link to="/login">
                            <Button tag={"button"} block className="mt-4">
                                {t('auth.confirmAccount.login')}
                            </Button>
                        </Link>
                    </>
                )
              }
              {isError && <p className="text-red-500 text-center">{message}</p>}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
};

export default ConfirmAccount;
