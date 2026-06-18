import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import './index.scss';
// Initialise i18next (English + Spanish) before the app renders. Side-effect
// import — resources are bundled, so init is synchronous and the first paint is
// already in the user's persisted language.
import 'i18n';
import { bootstrapGeoLanguage } from 'i18n/geoBootstrap';
import App from './App';
import { TripProvider } from 'context/TripContext';
import { UserProvider } from 'context/UserContext';
import { queryClient } from 'api/queryClient';
import { initPosthog } from 'lib/posthog';
import { installChunkReloadHandler, installSWUpdateReload } from 'utils';

// Recover from stale-deploy chunk 404s (new build replaced the hashed chunk
// names this tab still references) by reloading once. Covers direct dynamic
// imports; lazy routes are additionally wrapped via lazyWithRetry.
installChunkReloadHandler();

// Auto-reload onto a new deploy when the updated service worker takes control,
// so a deploy no longer requires manually clearing site data.
installSWUpdateReload();

// TanStack Query devtools dropped — the floating button cluttered the
// corner during everyday dev. Re-add behind a feature flag if/when
// it's actually useful for a debugging session.

// Boot-time analytics init. Silent no-op when VITE_POSTHOG_KEY is
// unset (dev without a key) or the SDK can't reach its host. Person
// profiles + identify happen later from UserContext once the user
// signs in.
initPosthog();

// First-visit only: default the UI language from the visitor's IP country
// (Spanish-speaking → ES, else EN). Fire-and-forget so it never blocks the
// first paint; it no-ops when the visitor already has a language. See
// `i18n/geoBootstrap`.
void bootstrapGeoLanguage();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterMoment}>
            <UserProvider>
                <TripProvider>
                    <React.StrictMode>
                        <App />
                    </React.StrictMode>
                </TripProvider>
            </UserProvider>
        </LocalizationProvider>
    </QueryClientProvider>
);
