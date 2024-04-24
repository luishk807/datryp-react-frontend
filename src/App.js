
import React from 'react';
import './App.css';
import { lazy, Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { multiTripDetailobj, singleTripDetailobj } from '../src/sample/tripData';
const Home = lazy(() => import('./components/Home'));
const SingleTrip = lazy(() => import('./components/SingleTrip'));
const MultipleTrip = lazy(() => import('./components/MultipleTrip'));

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={
                    <Suspense fallback={<>...</>}>
                        <Home />
                    </Suspense>
                } />
                <Route path="/single" element={
                    <Suspense fallback={<>...</>}>
                        <SingleTrip />
                    </Suspense>
                } />
                <Route path="/multiple" element={
                    <Suspense fallback={<>...</>}>
                        <MultipleTrip tripInfo={multiTripDetailobj}/>
                    </Suspense>
                }/>
            </Routes>
        </Router>
    );
}

export default App;