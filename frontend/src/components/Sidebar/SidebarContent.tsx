import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import routes, { ISidebarEntry, IRouteGroup, UserRole } from '../../routes/sidebar';
import { NavLink, Route } from 'react-router-dom';
import { CurrentDevice } from '../Devices/CurrentDevice';
import { useSelector } from "react-redux";
import { RootState } from "../../stores/globalStore";
import { selectUserType } from "../../stores/authSlice";
import SidebarGroup from './SidebarGroup';
import { APP_VERSION, SOURCE_URL } from '../../version';
import { WindmillContext } from '@windmill/react-ui';
import { useMantineColorScheme } from '@mantine/core';

function SidebarContent() {
  const { t } = useTranslation();
  const { globalDevice } = useSelector((state: RootState) => state.device);
  const userType = useSelector(selectUserType) as UserRole | null;
  const { mode, toggleMode } = useContext(WindmillContext);
  const { setColorScheme } = useMantineColorScheme();

  const isRoleVisible = (roles?: UserRole[]) => {
    if (!roles || roles.includes('all')) return true;
    if (userType && roles.includes(userType)) return true;
    return false;
  };

  const visibleEntries = routes.filter((entry: ISidebarEntry) => {
    if (entry.type === 'group') {
      return (entry as IRouteGroup).routes.some((r) => isRoleVisible(r.roles));
    }
    return isRoleVisible(entry.roles);
  });

  const getColorClasses = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return {
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
          active: 'text-customgreen-600 dark:text-customgreen-400 bg-customgreen-50 dark:bg-customgreen-900/20',
          border: 'bg-customgreen-600',
          iconHover: 'group-hover:text-customgreen-600 dark:group-hover:text-customgreen-400',
        };
      case 'Repair Journey':
        return {
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
          active: 'text-customgreen-600 dark:text-customgreen-400 bg-customgreen-50 dark:bg-customgreen-900/20',
          border: 'bg-customgreen-600',
          iconHover: 'group-hover:text-customgreen-600 dark:group-hover:text-customgreen-400',
        };
      case 'Assistant':
        return {
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
          active: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20',
          border: 'bg-pink-600',
          iconHover: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
        };
      case 'Impact calculator':
        return {
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
          active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
          border: 'bg-green-600',
          iconHover: 'group-hover:text-green-600 dark:group-hover:text-green-400',
        };
      default:
        return {
          hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
          active: 'text-customgreen-600 dark:text-customgreen-400 bg-customgreen-50 dark:bg-customgreen-900/20',
          border: 'bg-customgreen-600',
          iconHover: 'group-hover:text-customgreen-600 dark:group-hover:text-customgreen-400',
        };
    }
  };

  return (
    <><div className="py-4 text-gray-500 dark:text-gray-400">
      {/* In the header on a phone. */}
      <a className="ml-6 text-2xl font-bold  bg-clip-text text-customgreen-400 hidden lg:flex items-center" href="/app/home">
        <span className="material-symbols-outlined mr-2" style={{lineHeight:"2rem"}}>
            build_circle
        </span>
       Service Hub
      </a>
      <ul className="mt-2 lg:mt-10 sidebar-icons">
        {visibleEntries.map((entry: ISidebarEntry) => {
          if (entry.type === 'group') {
            return (
              <SidebarGroup
                key={entry.name}
                group={entry as IRouteGroup}
                userType={userType}
                globalDevice={globalDevice}
              />
            );
          }

          const colorClasses = getColorClasses(entry.name);

          return (
            <li className="relative px-3 py-1" key={entry.name}>
              <NavLink
                exact
                to={entry.path}
                className={`group inline-flex items-center w-full text-sm font-semibold transition-all duration-200 rounded-lg px-3 py-2 ${colorClasses.hover}`}
                activeClassName={colorClasses.active}
              >
                <Route path={entry.path} exact={entry.exact}>
                  <span
                    className={`absolute inset-y-0 left-0 w-0.5 ${colorClasses.border} rounded-tr-lg rounded-br-lg`}
                    aria-hidden="true"
                  ></span>
                </Route>
                <span className={`material-symbols-outlined text-base transition-colors duration-200 ${colorClasses.iconHover}`} aria-hidden="true">{entry.icon}</span>
                <span className="ml-3">{t(entry.translationKey)}</span>
              </NavLink>
            </li>
          );
        })}
        {/* On a phone the colour mode lives here, leaving the header to
            the site's name, the language, signing in and the menu. */}
        <li className="relative px-3 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 lg:hidden">
          <button
            onClick={() => {
              setColorScheme(mode === 'dark' ? 'light' : 'dark');
              toggleMode();
            }}
            className="group inline-flex items-center w-full text-sm font-semibold transition-all duration-200 rounded-lg px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              {mode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="ml-3">{mode === 'dark' ? t('header.lightMode') : t('header.darkMode')}</span>
          </button>
        </li>
      </ul>
    </div>
    <div className="p-4 ">
        <CurrentDevice/>
        {/* Kept inside this block rather than added as a third child of the
            sidebar: the <aside> is `justify-between`, so a third child would
            pull the current-device card away from the bottom. Monospaced
            because the interesting half is a commit hash. */}
        <p className="mt-4 font-mono text-xs text-center text-gray-400 dark:text-gray-500">
          {APP_VERSION}
        </p>
        <p className="mt-1 text-xs text-center">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200 underline"
          >
            {t('nav.sourceCode')}
          </a>
        </p>
    </div>
    </>
  )
}

export default SidebarContent