import React, { Suspense } from 'react'
import {createRoot} from 'react-dom/client';
import './i18n';
import './assets/css/tailwind.output.css'
import './assets/css/custom.css'
import './styles/sidebar-colors.css'
import App from './App'
import { SidebarProvider } from './context/SidebarContext'
import ThemedSuspense from './components/ThemedSuspense'
import { Windmill } from '@windmill/react-ui'
import { Provider } from 'react-redux'
import { persistor, store } from './stores/globalStore'
import { PersistGate } from 'redux-persist/integration/react';
import { createTheme, MantineProvider } from '@mantine/core';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import { suppressThemeTransitions } from './utils/themeTransitions';

suppressThemeTransitions();


const root = createRoot(document.getElementById('app')!); 
 const theme = createTheme({
    primaryColor: 'customgreen',
    colors: {
      'customgreen': [
        '#6e9922',
        '#e6f4d7',
        '#cce9af',
        '#b3df87',
        '#99d45f',
        '#6e9922',
        '#6e9922',
        '#4f6c18',
        '#3f5513',
        '#2f3f0e'],
      'customPurple': [
        '#FAF5FF',
        '#F3E8FF',
        '#E9D5FF',
        '#D8B4FE',
        '#C084FC',
        '#A855F7',
        '#9333EA',
        '#7E22CE',
        '#6B21A8',
        '#581C87'],
    },
  });
  
  

root.render(
    <SidebarProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
       <NotificationProvider>
          <MantineProvider theme={theme} defaultColorScheme='auto'>
            <Suspense fallback={<ThemedSuspense />}>
              <ErrorBoundary>
                <Windmill usePreferences>
                  <App />
                </Windmill>
              </ErrorBoundary>
            </Suspense>
          </MantineProvider>
       </NotificationProvider>
        </PersistGate>
      </Provider>
    </SidebarProvider>
);
