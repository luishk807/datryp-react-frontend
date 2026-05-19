import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import './index.scss';
import { useUser } from 'context/UserContext';

interface AdminGateProps {
    children: ReactNode;
}

/**
 * Renders children only when the current user is an admin.
 * - Unauthenticated: redirect to the gated `/single` route so the
 *   existing AuthGate handles login. After login, the user lands on
 *   `/single` (planning) rather than back at the dashboard — a minor
 *   UX gap that mirrors the rest of the app today.
 * - Authenticated non-admin: redirect to `/` so they don't see a
 *   broken/forbidden page.
 * - Authenticated admin: render children.
 *
 * The backend separately enforces `is_admin == True` on every
 * `/admin/...` endpoint via `get_current_admin`, so this client gate
 * is a UX guard rather than a security boundary.
 */
const AdminGate = ({ children }: AdminGateProps) => {
    const { user, isAdmin, isLoading } = useUser();

    if (isLoading) {
        return <p className="admin-gate-loading">Loading…</p>;
    }
    if (!user) {
        return <Navigate to="/single" replace />;
    }
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

export default AdminGate;
