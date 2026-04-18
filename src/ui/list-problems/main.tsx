import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@dynatrace/strato-components/core';
import { ListProblemsApp } from './ListProblemsApp';
import '../components/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <ListProblemsApp />
    </AppRoot>
  </StrictMode>,
);
