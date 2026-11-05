import React, { useContext, Suspense, useEffect, lazy } from 'react';
import { Switch, Route, Redirect, useLocation, useHistory } from 'react-router-dom';
import routes from '../routes';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Main from './Main';
import ThemedSuspense from '../components/ThemedSuspense';
import { SidebarContext } from '../context/SidebarContext';
import { useSelector } from 'react-redux';
import { selectNeedsOnboarding, selectUserType } from '../stores/authSlice';
import type { RootState } from '../stores/globalStore';

const Page404 = lazy(() => import('../pages/404'));

const ONBOARDING_PATHS = ['/app/onboarding', '/app/repairer-onboarding'];

// Pages rendues sans la gouttière de `Main` : elles se dimensionnent seules sur
// la hauteur laissée par l'en-tête.
const FULL_BLEED_PATHS = ['/app/assistant'];

function Layout() {
  const { isSidebarOpen, closeSidebar } = useContext(SidebarContext);
  const location = useLocation();
  const history = useHistory();
  const needsOnboarding = useSelector(selectNeedsOnboarding);
  const userType = useSelector(selectUserType);

  useEffect(() => {
    closeSidebar()
  }, [location]);

  // Redirect to onboarding on first login, unless already on an onboarding route
  useEffect(() => {
    if (!needsOnboarding) return;
    if (ONBOARDING_PATHS.includes(location.pathname)) return;
    const target = userType === 'repairer' ? '/app/repairer-onboarding' : '/app/onboarding';
    history.replace(target);
  }, [needsOnboarding, userType, location.pathname, history]);

  return (
    <div
      className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isSidebarOpen && 'overflow-hidden'} font-montserrat`}
    >
      <Sidebar />

      <div className="flex flex-col flex-1 w-full ">
        <Header />
        <Main fullBleed={FULL_BLEED_PATHS.includes(location.pathname)}>
          <Suspense fallback={<ThemedSuspense />}>
            <Switch>
              {routes.map((route, i) => {
                return route.component ? (
                  <Route
                    key={i}
                    exact={true}
                    path={`/app${route.path}`}
                    render={() => <route.component />}
                  />
                ) : null
              })}
              <Redirect exact from="/app" to="/app/dashboard" />
              <Route component={Page404} />
            </Switch>
          </Suspense>
        </Main>
      </div>
    </div>
  );
};

export default Layout;
