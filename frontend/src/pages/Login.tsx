import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import ImageLight from "../assets/img/login-office_edit.png";
import ImageDark from "../assets/img/login-office-dark_edit.png";
import { Label, Input, Button, WindmillContext } from "@windmill/react-ui";
import { checkAuth, loginUser, setGuest, setSession } from "../stores/authSlice";
import { FormEvent, useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../stores/globalStore";
import { useHistory, useLocation } from 'react-router-dom';
import { useNotification } from "../context/NotificationContext";
import { API_URL } from "../utils/globals";
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

function Login() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const location = useLocation();
  const {showNotification}  = useNotification();
  const { mode, toggleMode } = useContext(WindmillContext);
  const { setColorScheme } = useMantineColorScheme();

  const { loading, error, user, token: userToken } = useSelector((state: RootState) => state.auth);
  const [showWelcome, setShowWelcome] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Where to go once signed in, when the user was sent here from somewhere that
  // wants them back — the end of a repair journey, typically.
  const returnTo = readReturnTo(location.search);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };


  const handleError = (error?:string) => {
    showNotification(error ?? 'An error occurred.', 'error');
  };

  const handleBack = () => {
    // history.goBack() (POP navigation) does not reliably trigger a
    // re-render of the route tree in this app, so we push explicitly instead.
    if (history.length <= 1) {
      history.push('/');
    } else {
      history.push('/app/home');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Handle social login redirects: /login#token=...&refresh_token=...
    // Tokens arrive in the fragment so they never reach server logs. The query
    // string is still read as a fallback for redirects issued before that change.
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ''),
    );
    const token = hashParams.get('token') || params.get('token');
    if (token) {
      dispatch(
        setSession({
          token,
          refreshToken:
            hashParams.get('refresh_token') || params.get('refresh_token'),
        }),
      );
      dispatch(setGuest(false));
      dispatch(checkAuth());
      // Only the return destination is kept: replaying the token would re-enter
      // this branch on every render.
      history.replace({ pathname: '/login', search: returnToSearch(returnTo) });
      return;
    }

    // Handle OAuth2 authorization flow: /login?oauth_client_id=...
    const oauthClientId = params.get('oauth_client_id');
    if (oauthClientId) {
      const oauthRequest = {
        client_id: oauthClientId,
        redirect_uri: params.get('oauth_redirect_uri') || '',
        scope: params.get('oauth_scope') || '',
        state: params.get('oauth_state') || '',
      };
      sessionStorage.setItem('oauth_request', JSON.stringify(oauthRequest));
      // Clean URL without losing the component state
      history.replace({ pathname: '/login', search: returnToSearch(returnTo) });
    }
  }, [location.search, dispatch, history]);

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);
  

  useEffect(() => {
    if (user) {
      // Check if this is an OAuth2 authorization flow
      const oauthRequestStr = sessionStorage.getItem('oauth_request');
      if (oauthRequestStr) {
        const handleOAuthCallback = async () => {
          try {
            const oauthRequest = JSON.parse(oauthRequestStr);
            sessionStorage.removeItem('oauth_request');
            
            // Get the current token
            const token = localStorage.getItem('token') || userToken;
            if (!token) {
              console.error('No token found for OAuth callback');
              return;
            }
            
            // Build callback URL
            const callbackUrl = new URL(`${API_URL}/v1/auth/oauth2/authorize/callback`);
            callbackUrl.searchParams.set('client_id', oauthRequest.client_id);
            callbackUrl.searchParams.set('redirect_uri', oauthRequest.redirect_uri);
            if (oauthRequest.scope) callbackUrl.searchParams.set('scope', oauthRequest.scope);
            if (oauthRequest.state) callbackUrl.searchParams.set('state', oauthRequest.state);
            
            // Call the callback endpoint with authentication
            // Call the callback endpoint with authentication and expect JSON response
            const response = await fetch(callbackUrl.toString(), {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data && data.url) {
                window.location.href = data.url;
                return;
              }
            }
            
            console.error('OAuth callback failed or returned invalid response', response.status);
          } catch (e) {
            console.error('Failed to complete OAuth flow:', e);
          }
        };
        
        handleOAuthCallback();
        return;
      }
      
      setShowWelcome(true);
      setTimeout(() => {
        history.push(returnTo || '/app/home');
      }, 2000); // Redirection après 2 secondes
    }
  }, [user, history, returnTo]);
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
          aria-label="Toggle color mode"
        >
          {mode === 'dark' ? <SunIcon className="w-5 h-5" aria-hidden="true" /> : <MoonIcon className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>
      <div className="flex-1 h-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col overflow-y-auto md:flex-row">
          <div className="relative h-32 md:h-auto md:w-1/2">
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
            {!showWelcome && (
              <div className="hidden md:flex absolute inset-0 flex-col justify-end p-6">
                <div className="rounded-lg bg-white bg-opacity-80 dark:bg-opacity-0 p-5 text-black dark:text-white">
                  <h2 className="text-lg font-semibold mb-3">{t('auth.login.benefits.title')}</h2>
                  <ul>
                    <li className="flex items-center gap-2 mb-2 text-sm">
                      <span className="material-symbols-outlined text-base">devices</span>
                      {t('auth.login.benefits.devices')}
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-sm">
                      <span className="material-symbols-outlined text-base">history</span>
                      {t('auth.login.benefits.history')}
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-sm">
                      <span className="material-symbols-outlined text-base">eco</span>
                      {t('auth.login.benefits.co2')}
                    </li>
                    <li className="flex items-center gap-2 mb-2 text-sm">
                      <span className="material-symbols-outlined text-base">notifications</span>
                      {t('auth.login.benefits.notifications')}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          <main className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              {showWelcome  ? (
                <p className="text-green-500 text-center">
                  {t('auth.login.welcome', { name: user?.profile?.firstName })}
                </p>
              ) : (
                <>
                  <button
                    onClick={handleBack}
                    className="flex items-center mb-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
                    {t('auth.login.backButton')}
                  </button>
                  <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {t('auth.login.title')}
                  </h1>
                  {/* {error && <p className="text-red-500 text-center">{error}</p>} */}
                  <Label>
                    <span>{t('auth.login.email')}</span>
                    <Input
                      className="mt-1"
                      type="email"
                      placeholder="john@doe.com"
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      required
                    />
                  </Label>

                  <Label className="mt-4">
                    <span>{t('auth.login.password')}</span>
                    <Input
                      className="mt-1"
                      type="password"
                      placeholder="***************"
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                    />
                  </Label>

                  <Button
                    className="mt-4"
                    block
                    tag={"button"}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {t('auth.login.logIn')}
                  </Button>
                  <RecaptchaNotice />

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <Button
                      layout="outline"
                      onClick={() => (window.location.href = `${API_URL}/api/auth/google`)}
                      disabled
                    >
                      {t('auth.login.continueWithGoogle')}
                    </Button>
                    <Button
                      layout="outline"
                      onClick={() => (window.location.href = `${API_URL}/api/auth/facebook`)}
                      disabled
                    >
                      {t('auth.login.continueWithFacebook')}
                    </Button>
                  </div>

                  <Button
                    className="mt-4"
                    block
                    tag={"button"}
                    onClick={() => history.push('/app/home')}
                    disabled={loading}
                  >
                    {t('auth.login.continueAsGuest')}
                  </Button>

                  <hr className="my-8" />

                  <p className="mt-4">
                    <Link
                      className="text-sm font-medium text-customgreen dark:text-customgreen hover:underline"
                      to="/forgot-password"
                    >
                      {t('auth.login.forgotPassword')}
                    </Link>
                  </p>
                  <p className="mt-1">
                    <Link
                      className="text-sm font-medium text-customgreen dark:text-customgreen hover:underline"
                      to={`/create-account${returnToSearch(returnTo)}`}
                    >
                      {t('auth.login.createAccount')}
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

export default Login;
