import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import './index.scss';
import App from './App';
import { TripProvider } from 'context/TripContext';
import { UserProvider } from 'context/UserContext';
import { queryClient } from 'api/queryClient';

// TanStack Query devtools dropped — the floating button cluttered the
// corner during everyday dev. Re-add behind a feature flag if/when
// it's actually useful for a debugging session.

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
