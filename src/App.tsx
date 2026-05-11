
import React from 'react';
import './App.css';
import { lazy, Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
const Home = lazy(() => import('components/Sections/Home'));
const SingleTrip = lazy(() => import('components/Sections/SingleTrip'));
const MultipleTrip = lazy(() => import('components/Sections/MultipleTrip'));
const Account = lazy(() => import('components/Sections/Account'));
const Trips = lazy(() => import('components/Sections/Trips'));
const TripDetail = lazy(() => import('components/Sections/TripDetail'));
const Friends = lazy(() => import('components/Sections/Friends'));

import { TRIP_BASIC } from 'constants';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={
                    <Suspense fallback={<>...</>}>
                        <Home />
                    </Suspense>
                } />
                <Route path={TRIP_BASIC.SINGLE.route} element={
                    <Suspense fallback={<>...</>}>
                        <SingleTrip />
                    </Suspense>
                } />
                <Route path={TRIP_BASIC.MULTIPLE.route} element={
                    <Suspense fallback={<>...</>}>
                        <MultipleTrip />
                    </Suspense>
                }/>
                <Route path='/account' element={
                    <Suspense fallback={<>...</>}>
                        <Account />
                    </Suspense>
                }/>
                <Route path='/trips' element={
                    <Suspense fallback={<>...</>}>
                        <Trips />
                    </Suspense>
                }/>
                <Route path='/trip-detail' element={
                    <Suspense fallback={<>...</>}>
                        <TripDetail />
                    </Suspense>
                }/>
                <Route path='/friends' element={
                    <Suspense fallback={<>...</>}>
                        <Friends />
                    </Suspense>
                }/>
            </Routes>
        </Router>
    );
}

export default App;