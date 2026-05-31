
import React from 'react';
import './App.scss';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import AuthGate from 'components/AuthGate';
import AdminGate from 'components/AdminGate';
import BottomNav from 'components/BottomNav';
import OfflineGate from 'components/OfflineGate';
import RouteErrorBoundary from 'components/common/RouteErrorBoundary';
import PageLoader from 'components/common/PageLoader';
const Home = lazy(() => import('components/Sections/Home'));
const Dashboard = lazy(() => import('components/Sections/Dashboard'));
const DashboardOverview = lazy(() => import('components/Sections/Dashboard/OverviewCard'));
const DashboardSubscription = lazy(() => import('components/Sections/Dashboard/SubscriptionCard'));
const DashboardActivity = lazy(() => import('components/Sections/Dashboard/ActivityCard'));
const DashboardUsers = lazy(() => import('components/Sections/Dashboard/UsersCard'));
const DashboardCache = lazy(() => import('components/Sections/Dashboard/CacheCard'));
const DashboardSettings = lazy(() => import('components/Sections/Dashboard/SettingsCard'));
const SingleTrip = lazy(() => import('components/Sections/SingleTrip'));
const MultipleTrip = lazy(() => import('components/Sections/MultipleTrip'));
const Account = lazy(() => import('components/Sections/Account'));
const Trips = lazy(() => import('components/Sections/Trips'));
const TripDetail = lazy(() => import('components/Sections/TripDetail'));
const Friends = lazy(() => import('components/Sections/Friends'));
const Notifications = lazy(() => import('components/Sections/Notifications'));
const SearchResults = lazy(() => import('components/Sections/SearchResults'));
const PlaceDetail = lazy(() => import('components/Sections/PlaceDetail'));
const SearchHistoryPage = lazy(() => import('components/Sections/SearchHistoryPage'));
const Visited = lazy(() => import('components/Sections/Visited'));
const MyMap = lazy(() => import('components/Sections/MyMap'));
const Saved = lazy(() => import('components/Sections/Saved'));
const BucketList = lazy(() => import('components/Sections/BucketList'));
const AiTripBuilderPage = lazy(() => import('components/Sections/AiTripBuilderPage'));
const Signup = lazy(() => import('components/Sections/Signup'));
const Login = lazy(() => import('components/Sections/Login'));
const CountryDetail = lazy(() => import('components/Sections/CountryDetail'));
const PreparingTrip = lazy(() => import('components/Sections/PreparingTrip'));
const CityDetail = lazy(() => import('components/Sections/CityDetail'));
const Terms = lazy(() => import('components/Sections/Terms'));
const Privacy = lazy(() => import('components/Sections/Privacy'));
const About = lazy(() => import('components/Sections/About'));
const Contact = lazy(() => import('components/Sections/Contact'));
const Membership = lazy(() => import('components/Sections/Membership'));
const MembershipWelcome = lazy(() => import('components/Sections/MembershipWelcome'));
const ForgotPassword = lazy(() => import('components/Sections/ForgotPassword'));
const ResetPassword = lazy(() => import('components/Sections/ResetPassword'));
const ErrorPage = lazy(() => import('components/common/ErrorPage'));

import { TRIP_BASIC } from 'constants';

const Gated = ({ children, title, subtitle }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}) => (
    // RouteErrorBoundary wraps the gate so a render error during the
    // auth-check OR the gated content falls back to a friendly error
    // page with "Sign in" / "Go home" actions, instead of unmounting
    // the tree and leaving a blank page. The boundary lives ABOVE
    // AuthGate so a thrown error in AuthGate itself (e.g. a malformed
    // /auth/me response) is still caught.
    <RouteErrorBoundary>
        <AuthGate title={title} subtitle={subtitle}>
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </AuthGate>
    </RouteErrorBoundary>
);

function App() {
    return (
        <Router>
            <OfflineGate>
                <Routes>
                <Route path="/" element={
                    <Suspense fallback={<PageLoader />}>
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
                <Route path='/notifications' element={
                    <Gated
                        title="Sign in to see your notifications"
                        subtitle="Trip invites, status changes, and reminders show up here."
                    >
                        <Notifications />
                    </Gated>
                }/>
                <Route path='/search' element={
                    <Gated
                        title="Sign in to search"
                        subtitle="Free accounts get 5 searches per day. Pro members get Advanced Search."
                    >
                        <SearchResults />
                    </Gated>
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
                    <Suspense fallback={<PageLoader />}>
                        <CountryDetail />
                    </Suspense>
                }/>
                <Route path='/preparing-trip' element={
                    <Gated title="Sign in to plan your trip">
                        <PreparingTrip />
                    </Gated>
                }/>
                <Route path='/city' element={
                    <Suspense fallback={<PageLoader />}>
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
                <Route path='/my-map' element={
                    <Gated
                        title="Sign in to see your map"
                        subtitle="Mapper plots every country and place you have visited."
                    >
                        <MyMap />
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
                <Route path='/bucket-list' element={
                    <Gated
                        title="Sign in to see your bucket list"
                        subtitle="Travel goals you want to check off, in one place."
                    >
                        <BucketList />
                    </Gated>
                }/>
                <Route path='/plan-trip-ai' element={
                    <Gated
                        title="Sign in to plan a trip"
                        subtitle="Pro members get trips built for them. Free users land on the pricing page after signing in."
                    >
                        <AiTripBuilderPage />
                    </Gated>
                }/>
                <Route path='/dashboard' element={
                    <AdminGate>
                        <Suspense fallback={<PageLoader />}>
                            <Dashboard />
                        </Suspense>
                    </AdminGate>
                }>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path='overview' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardOverview />
                        </Suspense>
                    } />
                    <Route path='subscription' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardSubscription />
                        </Suspense>
                    } />
                    <Route path='activity' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardActivity />
                        </Suspense>
                    } />
                    <Route path='users' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardUsers />
                        </Suspense>
                    } />
                    <Route path='cache' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardCache />
                        </Suspense>
                    } />
                    <Route path='settings' element={
                        <Suspense fallback={<PageLoader />}>
                            <DashboardSettings />
                        </Suspense>
                    } />
                </Route>
                <Route path='/terms' element={
                    <Suspense fallback={<PageLoader />}>
                        <Terms />
                    </Suspense>
                }/>
                <Route path='/privacy' element={
                    <Suspense fallback={<PageLoader />}>
                        <Privacy />
                    </Suspense>
                }/>
                <Route path='/about' element={
                    <Suspense fallback={<PageLoader />}>
                        <About />
                    </Suspense>
                }/>
                <Route path='/contact' element={
                    <Suspense fallback={<PageLoader />}>
                        <Contact />
                    </Suspense>
                }/>
                <Route path='/membership' element={
                    <Suspense fallback={<PageLoader />}>
                        <Membership />
                    </Suspense>
                }/>
                <Route path='/membership/welcome' element={
                    <Suspense fallback={<PageLoader />}>
                        <MembershipWelcome />
                    </Suspense>
                }/>
                <Route path='/signup' element={
                    <Suspense fallback={<PageLoader />}>
                        <Signup />
                    </Suspense>
                }/>
                <Route path='/login' element={
                    <Suspense fallback={<PageLoader />}>
                        <Login />
                    </Suspense>
                }/>
                <Route path='/forgot-password' element={
                    <Suspense fallback={<PageLoader />}>
                        <ForgotPassword />
                    </Suspense>
                }/>
                <Route path='/reset-password' element={
                    <Suspense fallback={<PageLoader />}>
                        <ResetPassword />
                    </Suspense>
                }/>
                <Route path='*' element={
                    <Suspense fallback={<PageLoader />}>
                        <ErrorPage
                            pageTitle="Page not found"
                            title="We can't find that page"
                            description="The link may be broken, or the page may have moved. Head back to the home page to keep planning."
                        />
                    </Suspense>
                }/>
                </Routes>
                {/* Mobile-only fixed bottom nav. Hidden ≥720px by CSS;
                    hidden for signed-out users by the component itself. */}
                <BottomNav />
            </OfflineGate>
        </Router>
    );
}

export default App;
