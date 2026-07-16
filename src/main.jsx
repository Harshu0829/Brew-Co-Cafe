import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initAuthListener } from '@/store/authStore';

/**
 * Start the Supabase auth listener BEFORE rendering.
 * This ensures that if the user has a persisted session (page refresh),
 * the INITIAL_SESSION event fires and syncs the store before any
 * protected route tries to read the user.
 *
 * The listener stays alive for the full app lifetime.
 * Returns an unsubscribe fn — stored but rarely needed for a SPA.
 */
const _unsubAuth = initAuthListener();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
