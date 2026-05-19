import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Drawer, IconButton } from '@mui/material';
import Menu, { MenuActionItem } from 'components/common/Menu';
import classnames from 'classnames';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';
import SearchBar from 'components/SearchBar';
import IconLink from 'components/common/IconLink';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useUser } from 'context/UserContext';
import type { LoginForm } from 'components/common/LoginBtn';
import type { SignUpForm } from 'components/common/SignUpBtn';
import { MIN_SIGNUP_AGE, yearsSinceBirthYear } from 'utils/age';
import { BUTTON_VARIANT, LOGO_IMAGE } from 'constants';
import type { Country } from 'types';
import './index.scss';

interface HeaderProps {
    /** Renders a search bar between the logo and the nav (was the old Subheader). */
    withSearch?: boolean;
}

const Header = ({ withSearch = false }: HeaderProps) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { user, isAdmin, login, signup, logout } = useUser();
    const navigate = useNavigate();

    // Show "Upgrade to Pro" for free non-admin users so they have a
    // discoverable, voluntary path to subscribe — not just the reactive
    // paywall on cap-hit. Paid users see "Subscription" (their management
    // entry point). Admins get nothing — they bypass paywalls.
    const showUpgradeLink = !!user && !isAdmin && !user.isPaidMember;
    const showSubscriptionLink = !!user && !isAdmin && user.isPaidMember;

    const handleSearchSelected = (country: Country) => {
        if (!country?.code) return;
        // Route through the country preview page. The hero search doesn't
        // expose a mode picker, so hand 'single' as the default — matches
        // the most common path (single-destination trip).
        navigate(
            `/country?code=${encodeURIComponent(country.code)}&mode=single`
        );
    };

    const handleLogin = async (form: LoginForm) => {
        // The login modal labels its field "username"; the backend expects email.
        const email = form.username?.trim();
        const password = form.password ?? '';
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        await login(email, password);
    };

    const handleSignUp = async (form: SignUpForm) => {
        const email = (form.email || form.username)?.trim();
        const password = form.password ?? '';
        const birthYear = form.birthYear;
        const confirmAge = !!form.confirmAge13Plus;
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        if (birthYear == null) {
            throw new Error('Please select your year of birth.');
        }
        // Client-side mirror of the backend math gate — definite under-13s
        // never even get a network round-trip.
        if (yearsSinceBirthYear(birthYear) < MIN_SIGNUP_AGE) {
            throw new Error(
                `You must be at least ${MIN_SIGNUP_AGE} years old to create an account.`
            );
        }
        if (!confirmAge) {
            throw new Error(
                `Please confirm you are at least ${MIN_SIGNUP_AGE} years old.`
            );
        }
        await signup({
            email,
            password,
            birth_year: birthYear,
            confirm_age_13_plus: confirmAge,
            name: form.name,
            phone: form.phone,
        });
    };

    const handleMenuClose = () => setMenuAnchor(null);
    const handleNavigate = (path: string) => {
        navigate(path);
        handleMenuClose();
        setDrawerOpen(false);
    };
    const handleLogout = () => {
        logout();
        handleMenuClose();
        setDrawerOpen(false);
        navigate('/');
    };

    const initial = user?.name.charAt(0).toUpperCase() ?? '?';

    return (
        <header className="app-header">
            <div className={classnames('app-header-inner', { 'with-search': withSearch })}>
                <IconLink
                    to="/"
                    icon={<img src={LOGO_IMAGE} alt="" />}
                    ariaLabel="daTryp home"
                    className="app-header-logo"
                />

                {withSearch && (
                    <div className="app-header-search">
                        <SearchBar type="simple" onSelected={handleSearchSelected} />
                    </div>
                )}

                <nav className="app-header-nav">
                    {user ? (
                        <>
                            <ButtonCustom
                                type={BUTTON_VARIANT.NONE}
                                capitalizeType="none"
                                className="app-header-avatar"
                                ariaLabel={`Account menu for ${user.name}`}
                                onClick={(e) => setMenuAnchor(e.currentTarget)}
                            >
                                {initial}
                            </ButtonCustom>
                            <Menu
                                anchorEl={menuAnchor}
                                onClose={handleMenuClose}
                                paperClassName="user-menu"
                            >
                                <div className="user-menu-header">
                                    <span className="user-menu-avatar">{initial}</span>
                                    <div className="user-menu-info">
                                        <span className="user-menu-name">{user.name}</span>
                                        {user.email && (
                                            <span className="user-menu-email">
                                                {user.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Divider className="user-menu-divider" />
                                <MenuActionItem
                                    icon={<PersonOutlineIcon />}
                                    label="Account"
                                    onClick={() => handleNavigate('/account')}
                                />
                                {showUpgradeLink && (
                                    <MenuActionItem
                                        icon={<StarRoundedIcon />}
                                        label="Upgrade to Pro"
                                        onClick={() => handleNavigate('/membership')}
                                    />
                                )}
                                {showSubscriptionLink && (
                                    <MenuActionItem
                                        icon={<WorkspacePremiumRoundedIcon />}
                                        label="Subscription"
                                        onClick={() =>
                                            handleNavigate('/account#subscription')
                                        }
                                    />
                                )}
                                <MenuActionItem
                                    icon={<FlightTakeoffIcon />}
                                    label="My Trips"
                                    onClick={() => handleNavigate('/trips')}
                                />
                                <MenuActionItem
                                    icon={<CheckCircleRoundedIcon />}
                                    label="Visited Places"
                                    onClick={() => handleNavigate('/visited')}
                                />
                                <MenuActionItem
                                    icon={<BookmarkRoundedIcon />}
                                    label="Saved Places"
                                    onClick={() => handleNavigate('/saved')}
                                />
                                <MenuActionItem
                                    icon={<PeopleOutlineIcon />}
                                    label="Manage Friends"
                                    onClick={() => handleNavigate('/friends')}
                                />
                                <MenuActionItem
                                    icon={<HistoryRoundedIcon />}
                                    label="Recent searches"
                                    onClick={() => handleNavigate('/history')}
                                />
                                {isAdmin && (
                                    <MenuActionItem
                                        icon={<AdminPanelSettingsRoundedIcon />}
                                        label="Admin dashboard"
                                        onClick={() =>
                                            handleNavigate('/dashboard')
                                        }
                                    />
                                )}
                                <Divider className="user-menu-divider" />
                                <MenuActionItem
                                    icon={<LogoutRoundedIcon />}
                                    label="Logout"
                                    onClick={handleLogout}
                                    tone="danger"
                                />
                            </Menu>
                        </>
                    ) : (
                        <>
                            <span className="auth-link">
                                <LoginBtn onClick={handleLogin} />
                            </span>
                            <span className="auth-cta">
                                <SignUp onClick={handleSignUp} />
                            </span>
                        </>
                    )}
                </nav>

                <IconButton
                    className="app-header-burger"
                    aria-label="Open menu"
                    onClick={() => setDrawerOpen(true)}
                >
                    <MenuRoundedIcon />
                </IconButton>
            </div>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                <div className="app-header-drawer">
                    <div className="drawer-head">
                        <IconButton
                            aria-label="Close menu"
                            onClick={() => setDrawerOpen(false)}
                        >
                            <CloseRoundedIcon />
                        </IconButton>
                    </div>
                    <div className="drawer-body">
                        {user ? (
                            <>
                                <div className="drawer-user">
                                    <span className="app-header-avatar drawer-avatar">
                                        {initial}
                                    </span>
                                    <span className="drawer-user-name">{user.name}</span>
                                </div>
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Account"
                                    onClick={() => handleNavigate('/account')}
                                />
                                {showUpgradeLink && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link drawer-upgrade"
                                        label="Upgrade to Pro"
                                        onClick={() => handleNavigate('/membership')}
                                    />
                                )}
                                {showSubscriptionLink && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link"
                                        label="Subscription"
                                        onClick={() =>
                                            handleNavigate(
                                                '/account#subscription'
                                            )
                                        }
                                    />
                                )}
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="My Trips"
                                    onClick={() => handleNavigate('/trips')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Visited Places"
                                    onClick={() => handleNavigate('/visited')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Saved Places"
                                    onClick={() => handleNavigate('/saved')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Manage Friends"
                                    onClick={() => handleNavigate('/friends')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Recent searches"
                                    onClick={() => handleNavigate('/history')}
                                />
                                {isAdmin && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link"
                                        label="Admin dashboard"
                                        onClick={() =>
                                            handleNavigate('/dashboard')
                                        }
                                    />
                                )}
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link drawer-logout"
                                    onClick={handleLogout}
                                >
                                    <LogoutRoundedIcon fontSize="small" /> Logout
                                </ButtonCustom>
                            </>
                        ) : (
                            <>
                                <div className="drawer-auth">
                                    <LoginBtn onClick={handleLogin} />
                                </div>
                                <div className="drawer-auth signup">
                                    <SignUp onClick={handleSignUp} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Drawer>
        </header>
    );
};

export default Header;
