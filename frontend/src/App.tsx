import React,{ lazy,  useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory, useLocation } from 'react-router-dom'
import AccessibleNavigationAnnouncer from './components/AccessibleNavigationAnnouncer'
//import PrivateRoute from './components/PrivateRoute'
import { checkAuth } from './stores/authSlice'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './stores/globalStore'
import { useGeolocation } from './hooks/useGeolocation' // Import useGeolocation
import { useSyncRepairJourneys } from './hooks/useSyncRepairJourneys'
import { SurveyProvider } from './context/SurveyContext'

import PageTracker from './components/PageTracker'

const Layout = lazy(() => import('./containers/Layout'))
const Login = lazy(() => import('./pages/Login'))
const CreateAccount = lazy(() => import('./pages/CreateAccount'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ConfirmAccount = lazy(() => import('./pages/ConfirmAccount'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MobilePhotoHandoff = lazy(() => import('./pages/MobilePhotoHandoff'))

const App = () => {
  console.log('App')
  const dispatch: AppDispatch = useDispatch();

  const {  user } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    dispatch(checkAuth()); // Vérifie l'authentification au chargement
  }, [dispatch]);

  useGeolocation(); // Call the hook here
  useSyncRepairJourneys(); // Adopts journeys recorded here, restores the account's

  return (
    <SurveyProvider>
      <Router>
        <PageTracker />
        <AccessibleNavigationAnnouncer />
        <Switch>

          <Route path="/login" component={Login} />
          <Route path="/create-account" component={CreateAccount} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/confirm/:token" component={ConfirmAccount} />
          <Route path="/reset-password/:token" component={ResetPassword} />
          <Route path="/m/:pairingId" component={MobilePhotoHandoff} />
          <Route path="/app" component={Layout} />

          {/* Place new routes over this */}
          {/* <PrivateRoute path="/app" component={Layout} /> */}
          {/* If you have an index page, you can remothis Redirect */}
          <Redirect exact from="/" to="/app/home" />
        </Switch>
      </Router>
    </SurveyProvider>
  )
}


export default App