
import React from 'react';
import './App.scss';
import { lazy, Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import AuthGate from 'components/AuthGate';
const Home = lazy(() => import('components/Sections/Home'));
const SingleTrip = lazy(() => import('components/Sections/SingleTrip'));
const MultipleTrip = lazy(() => import('components/Sections/MultipleTrip'));
const Account = lazy(() => import('components/Sections/Account'));
const Trips = lazy(() => import('components/Sections/Trips'));
const TripDetail = lazy(() => import('components/Sections/TripDetail'));
const Friends = lazy(() => import('components/Sections/Friends'));
const SearchResults = lazy(() => import('components/Sections/SearchResults'));
const PlaceDetail = lazy(() => import('components/Sections/PlaceDetail'));
const SearchHistoryPage = lazy(() => import('components/Sections/SearchHistoryPage'));
const Visited = lazy(() => import('components/Sections/Visited'));
const Saved = lazy(() => import('components/Sections/Saved'));
const CountryDetail = lazy(() => import('components/Sections/CountryDetail'));
const CityDetail = lazy(() => import('components/Sections/CityDetail'));
const Terms = lazy(() => import('components/Sections/Terms'));
const ErrorPage = lazy(() => import('components/common/ErrorPage'));

import { TRIP_BASIC } from 'constants';

const Gated = ({ children, title, subtitle }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}) => (
    <AuthGate title={title} subtitle={subtitle}>
        <Suspense fallback={<>...</>}>{children}</Suspense>
    </AuthGate>
);

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
                    <Gated title="Sign in to plan your trip">
                        <SingleTrip />
                    </Gated>
                } />
                <Route path={TRIP_BASIC.MULTIPLE.route} element={
                    <Gated title="Sign in to plan your trip">
                        <MultipleTrip />
                    </Gated>
                }/>
                <Route path='/account' element={
                    <Gated
                        title="Sign in to manage your account"
                        subtitle="Profile, preferences and password live here."
                    >
                        <Account />
                    </Gated>
                }/>
                <Route path='/trips' element={
                    <Gated
                        title="Sign in to see your trips"
                        subtitle="All your itineraries in one place."
                    >
                        <Trips />
                    </Gated>
                }/>
                <Route path='/trip-detail' element={
                    <Gated
                        title="Sign in to see this trip"
                        subtitle="You need an account to view itinerary details."
                    >
                        <TripDetail />
                    </Gated>
                }/>
                <Route path='/friends' element={
                    <Gated
                        title="Sign in to manage friends"
                        subtitle="Invite friends, accept requests, plan together."
                    >
                        <Friends />
                    </Gated>
                }/>
                <Route path='/search' element={
                    <Suspense fallback={<>...</>}>
                        <SearchResults />
                    </Suspense>
                }/>
                <Route path='/place' element={
                    <Gated
                        title="Sign in to view this place"
                        subtitle="Reviews, bookmarks, and travel info are all tied to your account."
                    >
                        <PlaceDetail />
                    </Gated>
                }/>
                <Route path='/country' element={
                    <Suspense fallback={<>...</>}>
                        <CountryDetail />
                    </Suspense>
                }/>
                <Route path='/city' element={
                    <Suspense fallback={<>...</>}>
                        <CityDetail />
                    </Suspense>
                }/>
                <Route path='/history' element={
                    <Gated
                        title="Sign in to see your search history"
                        subtitle="Your recent searches are tied to your account."
                    >
                        <SearchHistoryPage />
                    </Gated>
                }/>
                <Route path='/visited' element={
                    <Gated
                        title="Sign in to see your visited places"
                        subtitle="Your visited list is tied to your account."
                    >
                        <Visited />
                    </Gated>
                }/>
                <Route path='/saved' element={
                    <Gated
                        title="Sign in to see your saved places"
                        subtitle="Your bookmarks are tied to your account."
                    >
                        <Saved />
                    </Gated>
                }/>
                <Route path='/terms' element={
                    <Suspense fallback={<>...</>}>
                        <Terms />
                    </Suspense>
                }/>
                <Route path='*' element={
                    <Suspense fallback={<>...</>}>
                        <ErrorPage
                            pageTitle="Page not found"
                            title="We can't find that page"
                            description="The link may be broken, or the page may have moved. Head back to the home page to keep planning."
                        />
                    </Suspense>
                }/>
            </Routes>
        </Router>
    );
}

export default App;
