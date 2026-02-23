import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@dynatrace/strato-components/core';
import { SmartscapeRelationshipsApp } from './SmartscapeRelationshipsApp';
import '../components/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <SmartscapeRelationshipsApp />
    </AppRoot>
  </StrictMode>,
);
