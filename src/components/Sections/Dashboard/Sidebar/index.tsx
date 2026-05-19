import { NavLink, useNavigate } from 'react-router-dom';
import './index.scss';
import { IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import classnames from 'classnames';
import { useUser } from 'context/UserContext';
import { LOGO_IMAGE } from 'constants';

export interface SidebarProps {
    /** Mobile drawer state — when true, the sidebar slides in as an
     *  overlay; when false (default), the sidebar is hidden on mobile
     *  and rendered inline on desktop. */
    open: boolean;
    onClose: () => void;
}

const NAV_ITEMS = [
    { to: '/dashboard/overview', label: 'Overview', icon: DashboardRoundedIcon },
    {
        to: '/dashboard/subscription',
        label: 'Subscription',
        icon: CreditCardRoundedIcon,
    },
    { to: '/dashboard/activity', label: 'Activity', icon: InsightsRoundedIcon },
    { to: '/dashboard/users', label: 'Users', icon: GroupRoundedIcon },
] as const;

/**
 * SendGrid-style left sidebar. Desktop: always visible, sticky. Mobile:
 * hidden by default; the parent toggles `open` to slide it in over the
 * content with a translucent backdrop.
 *
 * Layout from top to bottom:
 *   - Brand (logo + "Admin" label)
 *   - Nav links (the four dashboard sections)
 *   - Footer: signed-in identity, "back to site" link, logout
 *
 * The dashboard intentionally drops the regular app `<Header />` (and
 * its user-avatar menu) since this is the admin surface — everything
 * the admin needs lives in the sidebar.
 */
const Sidebar = ({ open, onClose }: SidebarProps) => {
    const { user, logout } = useUser();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/');
    };

    const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

    return (
        <>
            {/* Backdrop only renders / is interactive on mobile via CSS. */}
            <div
                className={classnames('dashboard-sidebar-backdrop', {
                    'is-open': open,
                })}
                onClick={onClose}
                aria-hidden={!open}
            />
            <aside
                className={classnames('dashboard-sidebar', {
                    'is-open': open,
                })}
                aria-label="Admin navigation"
            >
                <div className="dashboard-sidebar-head">
                    <NavLink
                        to="/dashboard/overview"
                        className="dashboard-sidebar-brand"
                        onClick={onClose}
                    >
                        <img
                            src={LOGO_IMAGE}
                            alt=""
                            className="dashboard-sidebar-logo"
                        />
                        <span className="dashboard-sidebar-title">Admin</span>
                    </NavLink>
                    <IconButton
                        className="dashboard-sidebar-close"
                        aria-label="Close menu"
                        onClick={onClose}
                        size="small"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </div>
                <nav className="dashboard-sidebar-nav">
                    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                classnames('dashboard-sidebar-link', {
                                    'is-active': isActive,
                                })
                            }
                        >
                            <Icon className="dashboard-sidebar-icon" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="dashboard-sidebar-foot">
                    {user && (
                        <div className="dashboard-sidebar-identity">
                            <span className="dashboard-sidebar-avatar">
                                {initial}
                            </span>
                            <div className="dashboard-sidebar-identity-meta">
                                <span className="dashboard-sidebar-identity-name">
                                    {user.name}
                                </span>
                                {user.email && (
                                    <span className="dashboard-sidebar-identity-email">
                                        {user.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    <NavLink
                        to="/"
                        onClick={onClose}
                        className="dashboard-sidebar-link dashboard-sidebar-foot-link"
                    >
                        <HomeRoundedIcon className="dashboard-sidebar-icon" />
                        <span>Back to site</span>
                    </NavLink>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="dashboard-sidebar-link dashboard-sidebar-foot-link dashboard-sidebar-logout"
                    >
                        <LogoutRoundedIcon className="dashboard-sidebar-icon" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
