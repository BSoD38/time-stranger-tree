import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/hanken-grotesk/800.css';
// Squared "digital" face for the brand wordmark + splash only (see --font-brand).
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './theme/tokens.css';
import App from './App';
import { initTheme } from './theme/theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
