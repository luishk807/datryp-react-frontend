import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import './index.scss';
import { IconButton } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import Sidebar from './Sidebar';

/**
 * Admin dashboard shell. Full-width SendGrid-style layout: persistent
 * left `<Sidebar />` (with the dashboard's own brand, nav, and logout
 * footer), and the active section rendered via React Router's
 * `<Outlet />`.
 *
 * The dashboard intentionally does NOT render the regular app
 * `<Header />` — the admin surface is self-contained, and the avatar
 * dropdown / search bar would be visual noise here. Logout, identity,
 * and "Back to site" live in the sidebar footer instead.
 *
 * Routes are nested under `/dashboard/*` in `App.tsx` so the URL drives
 * which card section renders and browser back/forward work as expected.
 *
 * Mobile (≤768px): the sidebar collapses into a slide-in drawer
 * triggered by a thin top bar with a hamburger button. The drawer
 * auto-closes on route change so the user lands on the new section
 * without an extra dismiss tap.
 */
const Dashboard = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Close the mobile drawer whenever the route changes — keeps the
        // UI tidy after the user picks a section.
        setDrawerOpen(false);
    }, [location.pathname]);

    return (
        <div className="dashboard-shell">
            <Sidebar
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
            <main className="dashboard-main">
                <div className="dashboard-mobile-bar">
                    <IconButton
                        className="dashboard-mobile-toggle"
                        aria-label="Open menu"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <MenuRoundedIcon />
                    </IconButton>
                </div>
                <div className="dashboard-main-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
