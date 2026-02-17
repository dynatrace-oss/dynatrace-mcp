import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@dynatrace/strato-components/core';
import { ExecuteDqlApp } from './ExecuteDqlApp';
import '../components/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <ExecuteDqlApp />
    </AppRoot>
  </StrictMode>,
);
