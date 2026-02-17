import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@dynatrace/strato-components/core';
import { ExecuteDqlApp } from './ExecuteDqlApp';
import { ExecuteDqlAppDev } from './ExecuteDqlApp.dev';
import '../components/global.css';

// Use dev version in development mode to load mock data
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const App = isDev ? ExecuteDqlAppDev : ExecuteDqlApp;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
  </StrictMode>,
);
