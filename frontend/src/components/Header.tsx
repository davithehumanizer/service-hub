import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarContext } from '../context/SidebarContext';
import { logoutUser } from '../stores/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import {
  SearchIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  MenuIcon,
  OutlinePersonIcon,
  OutlineCogIcon,
  OutlineLogoutIcon,
} from '../icons';
import { Avatar, Badge, Dropdown, DropdownItem, WindmillContext } from '@windmill/react-ui';
import { Button, useMantineColorScheme, Menu } from '@mantine/core';
import E6Logo from "../assets/img/E6.png";
import { AppDispatch, RootState, persistor } from '../stores/globalStore';
import Omnisearch from './Omnisearch';

// Each language in its own name, which the people who read it look for.
const LANGUAGE_OPTIONS = [
  { value: 'en', name: 'English' },
  { value: 'fr', name: 'Français' },
  { value: 'nl', name: 'Nederlands' },
  { value: 'de', name: 'Deutsch' },
];

function Header() {
  const { t, i18n } = useTranslation();
  const { mode, toggleMode } = useContext(WindmillContext);
  const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);
  const dispatch = useDispatch<AppDispatch>();
  const guest = useSelector((state: RootState) => state.auth.guest);

  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const { setColorScheme } = useMantineColorScheme();
  const language = i18n.language.slice(0, 2);
  
  const logout = async () => {
    // Il faut attendre le thunk : il révoque le refresh token côté serveur et
    // son reducer vide la session. Rediriger sans attendre rechargeait la page
    // avant que l'état ne soit nettoyé, et redux-persist réhydratait aussitôt
    // la session depuis localStorage — on se retrouvait reconnecté.
    await dispatch(logoutUser());
    // Puis forcer l'écriture de l'état vidé avant que la page ne parte.
    await persistor.flush();
    // Full page reload (not a client-side SPA transition) so the reCAPTCHA
    // script is guaranteed to load fresh on the login page.
    window.location.href = '/login';
  };


  function handleNotificationsClick() {
    setIsNotificationsMenuOpen(!isNotificationsMenuOpen);
  };

  function handleProfileClick() {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  return (
    <header className="flex z-40 bg-white shadow-bottom dark:bg-gray-800">
      <a className="flex-1 self-center ml-6 text-lg font-bold text-customgreen dark:text-customgreen hidden lg:block" href="/app/home">
        <img src={E6Logo} alt="E6 Logo" className='h-16' />
      </a>
      <div className="container  py-4 flex flex-1 items-center justify-end h-full px-4 sm:px-6 lg:px-12 mx-auto text-customgreen-600 dark:text-customgreen-300">
        {/* On a phone, the site's name, back to the home page: nothing said
            which site this was, nor led home (PBI 13901). The desktop has
            it at the top of the sidebar. */}
        <Link
          to="/app/home"
          className="mr-auto flex items-center gap-1.5 text-lg font-bold text-customgreen-600 dark:text-customgreen-400 lg:hidden"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">build_circle</span>
          Service Hub
        </Link>
        {/* <!-- Search input --> */}
        {/* <Omnisearch /> */}
        <ul className="flex items-center flex-shrink-0 space-x-3 sm:space-x-6">
          {/* <!-- Theme toggler: in the menu on a phone --> */}
          <li className="hidden lg:flex">
            <button
              className="p-1.5 -m-1.5 rounded-md focus:outline-none focus:shadow-outline-customgreen"
              onClick={() => {
                setColorScheme(mode === 'dark' ? 'light' : 'dark');
                toggleMode();
              }}
              aria-label={t('header.toggleColorMode')}>
            {
              mode === 'dark' ? (
                <SunIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <MoonIcon className="w-5 h-5" aria-hidden="true" />
              )
            }
            </button>
          </li>
          {/* <!-- Notifications menu (hidden, reserved for future use) --> */}
          {/* <li className="relative">
            <button
              className="relative align-middle rounded-md focus:outline-none focus:shadow-outline-customgreen"
              onClick={handleNotificationsClick}
              aria-label={t('header.notifications')}
              aria-haspopup="true"
            >
              <BellIcon className="w-5 h-5" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 inline-block w-3 h-3 transform translate-x-1 -translate-y-1 bg-red-600 border-2 border-white rounded-full dark:border-gray-800"
              ></span>
            </button>
            <Dropdown
              align="right"
              isOpen={isNotificationsMenuOpen}
              onClose={() => setIsNotificationsMenuOpen(false)}
            >
              <DropdownItem tag="a" href="#" className="justify-between">
                <span>{t('header.messages')}</span>
                <Badge type="danger">13</Badge>
              </DropdownItem>
              <DropdownItem tag="a" href="#" className="justify-between">
                <span>{t('header.notifications')}</span>
                <Badge type="danger">2</Badge>
              </DropdownItem>
            </Dropdown>
          </li> */}
          {/* <!-- Language selector --> */}
          {/* One chevron, not the select's two, which read as a number
              stepper rather than a choice of language. */}
          <li className="flex items-center">
            <Menu position="bottom-end" shadow="md" withinPortal>
              <Menu.Target>
                <button
                  className="flex items-center gap-1 h-8 pl-2 pr-1 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:shadow-outline-customgreen"
                  aria-label={t('header.language')}
                  title={t('header.language')}
                >
                  <span className="hidden sm:inline-flex">
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">language</span>
                  </span>
                  {language.toUpperCase()}
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">expand_more</span>
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                {LANGUAGE_OPTIONS.map(({ value, name }) => (
                  <Menu.Item
                    key={value}
                    lang={value}
                    onClick={() => i18n.changeLanguage(value)}
                    rightSection={value === language
                      ? <span className="material-symbols-outlined text-base text-customgreen-600" aria-hidden="true">check</span>
                      : null}
                  >
                    {name}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </li>
          {/* <!-- Profile menu --> */}
          <li className="relative flex items-center">
                {guest ? (
                  <>
                    {/* An icon on a phone: a button a third of the bar wide
                        said an account was needed, which it is not. */}
                    <button
                      className="lg:hidden p-1.5 -m-1.5 rounded-md focus:outline-none focus:shadow-outline-customgreen"
                      // Force a full page reload (not a client-side SPA transition) so
                      // the reCAPTCHA script is guaranteed to load fresh on the login page.
                      onClick={() => { window.location.href = '/login'; }}
                      aria-label={t('header.login')}
                      title={t('header.login')}
                    >
                      <span className="material-symbols-outlined text-3xl" aria-hidden="true">account_circle</span>
                    </button>
                    <span className="hidden lg:inline-flex">
                      <Button
                        className="rounded-md focus:shadow-outline-customgreen focus:outline-none"
                        onClick={() => {
                          // Force a full page reload (not a client-side SPA transition) so
                          // the reCAPTCHA script is guaranteed to load fresh on the login page.
                          window.location.href = '/login';
                        }}
                        aria-label={t('header.login')}
                      >
                        {t('header.login')}
                      </Button>
                    </span>
                  </>
                  ) : (
                    <>
                      <button
                        className="rounded-full focus:shadow-outline-customgreen focus:outline-none"
                        onClick={handleProfileClick}
                        aria-label={t('header.account')}
                        aria-haspopup="true"
                      >
                        <Avatar
                          className="align-middle"
                          src="https://images.unsplash.com/photo-1502378735452-bc7d86632805?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=aa3a807e1bbdfd4364d1f449eaa96d82"
                          alt=""
                          aria-hidden="true"
                        />
                      </button>
                      <Dropdown
                        align="right"
                        isOpen={isProfileMenuOpen}
                        onClose={() => setIsProfileMenuOpen(false)}
                      >
                        <DropdownItem tag="a" href="/app/profile">
                          <span className="flex items-center">
                            <OutlinePersonIcon className="w-4 h-4 mr-3" aria-hidden="true" />
                            <span>{t('header.profile')}</span>
                          </span>
                        </DropdownItem>
                        <DropdownItem tag="a" href="#">
                          <span className="flex items-center">
                            <OutlineCogIcon className="w-4 h-4 mr-3" aria-hidden="true" />
                            <span>{t('header.settings')}</span>
                          </span>
                        </DropdownItem>
                        <DropdownItem onClick={logout}>
                          <span className="flex items-center">
                            <OutlineLogoutIcon className="w-4 h-4 mr-3" aria-hidden="true" />
                            <span>{t('header.logOut')}</span>
                          </span>
                        </DropdownItem>
                      </Dropdown>

                    </>
                  )}
          </li>
          {/* On the right, within the thumb's reach; a cross once open. */}
          <li className="flex lg:hidden">
            <button
              className="p-2 -mr-2 rounded-md focus:outline-none focus:shadow-outline-customgreen"
              onClick={toggleSidebar}
              aria-label={t('header.menu')}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? (
                <span className="material-symbols-outlined text-2xl leading-none" aria-hidden="true">close</span>
              ) : (
                <MenuIcon className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default Header;