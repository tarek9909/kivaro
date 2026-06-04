import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { AppProviders } from './app/providers/AppProviders.jsx';
import './styles/index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root was not found in document.');
}

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);
