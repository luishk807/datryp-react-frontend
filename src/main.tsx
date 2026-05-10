import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TripProvider } from 'context/TripContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <LocalizationProvider dateAdapter={AdapterMoment}>
        <TripProvider>
            <React.StrictMode>
                <App />
            </React.StrictMode>
        </TripProvider>
    </LocalizationProvider>
);
