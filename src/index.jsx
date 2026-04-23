import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WalletProviders from './WalletProviders';

// Some Solana wallet adapter deps reference the Node `Buffer` global.
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </React.StrictMode>
);
