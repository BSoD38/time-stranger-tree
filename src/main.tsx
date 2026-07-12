import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './theme/tokens.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
