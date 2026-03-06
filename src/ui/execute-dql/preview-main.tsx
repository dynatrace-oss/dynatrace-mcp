import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from '@dynatrace/strato-components/core';
import { ExecuteDqlPreview } from './ExecuteDqlPreview';
import '../components/global.css';

// Apply a solid background so screenshots look clean
document.documentElement.setAttribute('data-theme', 'light');
document.body.style.background = '#fff';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot>
      <ExecuteDqlPreview />
    </AppRoot>
  </StrictMode>,
);
