import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Divider, Drawer, IconButton } from '@mui/material';
import SearchBarIcon from '@mui/icons-material/SearchRounded';
import Menu, { MenuActionItem } from 'components/common/Menu';
import classnames from 'classnames';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LoginBtn from 'components/common/LoginBtn';
import SearchBar from 'components/SearchBar';
import type { PlaceResult } from 'api/hooks/usePlaces';
import IconLink from 'components/common/IconLink';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import NotificationBell from 'components/NotificationBell';
import { useUser } from 'context/UserContext';
import type { LoginForm } from 'components/common/LoginBtn';
import { BUTTON_VARIANT, LOGO_ICON_IMAGE, LOGO_IMAGE } from 'constants';
import './index.scss';

interface HeaderProps {
    /** Renders a search bar between the logo and the nav (was the old Subheader). */
    withSearch?: boolean;
    /** Optional page-title slot rendered immediately after the logo,
     *  separated by a vertical divider. Used by full-bleed pages
     *  (e.g. /atlas-map) to surface the page name without spending a
     *  whole row of vertical space on a page-header. */
    pageTitle?: ReactNode;
}

const Header = ({ withSearch = false, pageTitle }: HeaderProps) => {
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { user, isAdmin, login, logout } = useUser();
    const navigate = useNavigate();
    // The header's signup affordance is now a navigation link to the
    // dedicated `/signup` page (multi-step + onboarding inline). Both
    // LoginBtn's bottom "Sign up" link and the standalone header CTA
    // share this single handler.
    const goToSignup = () => navigate('/signup');

    // Show "Upgrade to Pro" for free non-admin users so they have a
    // discoverable, voluntary path to subscribe — not just the reactive
    // paywall on cap-hit. Paid users see "Subscription" (their management
    // entry point). Admins get nothing — they bypass paywalls.
    const showUpgradeLink = !!user && !isAdmin && !user.isPaidMember;
    const showSubscriptionLink = !!user && !isAdmin && user.isPaidMember;

    // Header search uses the unified PLACE mode (cities + countries) so
    // queries like "Hawaii" or "Honolulu" resolve to a city preview
    // instead of returning nothing — the previous country-only flow
    // silently failed on anything that wasn't a sovereign-state name.
    // Routes cities to /city and countries to /country, same as the
    // homepage hero. Single-destination by convention; the user can
    // switch to multi from inside the trip-builder.
    const handlePlaceSelected = (place: PlaceResult) => {
        if (!place?.countryCode) return;
        if (place.kind === 'country') {
            navigate(
                `/country?code=${encodeURIComponent(place.countryCode)}&mode=single`
            );
            return;
        }
        navigate(
            `/city?name=${encodeURIComponent(place.name)}` +
                `&country=${encodeURIComponent(place.countryName)}` +
                `&code=${encodeURIComponent(place.countryCode)}` +
                `&mode=single`
        );
    };

    const handleLogin = async (form: LoginForm) => {
        // The login modal labels its field "username"; the backend expects email.
        const email = form.username?.trim();
        const password = form.password ?? '';
        if (!email || !password) {
            throw new Error(t('auth.emailPasswordRequired'));
        }
        await login(email, password);
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
    const profileImg = user?.profileImageUrl ?? null;
    // Fallback: when the <img> fails to load (S3 ACL, iOS Safari TLS
    // quirk, stale CloudFront cache after a re-upload) swap to the
    // initial-letter chip. Reset whenever the URL changes so a new
    // upload gets a fresh attempt.
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [profileImg]);
    // Re-usable contents for any circular avatar in this header. When the
    // user has uploaded a profile picture we render it; otherwise we fall
    // back to the initial-letter chip.
    const avatarContent = profileImg && !avatarLoadFailed ? (
        <img
            src={profileImg}
            alt=""
            className="app-header-avatar-img"
            decoding="async"
            loading="eager"
            onError={() => setAvatarLoadFailed(true)}
        />
    ) : (
        initial
    );

    return (
        <header className="app-header">
            <div
                className={classnames('app-header-inner', {
                    'with-search': withSearch,
                    'is-authed': !!user,
                })}
            >
                {/* Brand group: logo + (optional) page-title. Wrapping
                    them in one flex container keeps the title flush
                    against the logo regardless of the outer
                    `space-between` distribution. */}
                <div className="app-header-brand">
                    <IconLink
                        to="/"
                        icon={
                            <>
                                <img
                                    src={LOGO_IMAGE}
                                    alt=""
                                    className="app-header-logo-full"
                                />
                                <img
                                    src={LOGO_ICON_IMAGE}
                                    alt=""
                                    className="app-header-logo-icon"
                                />
                            </>
                        }
                        ariaLabel={t('nav.homeLink')}
                        className="app-header-logo"
                    />
                    {pageTitle && (
                        <span className="app-header-page-title">
                            <span className="app-header-page-title-text">
                                {pageTitle}
                            </span>
                        </span>
                    )}
                </div>

                {withSearch && (
                    <div className="app-header-search">
                        <SearchBarIcon className="app-header-search-icon" />
                        <SearchBar
                            type="simple"
                            mode="place"
                            onPlaceSelected={handlePlaceSelected}
                        />
                    </div>
                )}

                <nav className="app-header-nav">
                    {user ? (
                        <>
                            <NotificationBell />
                            <ButtonCustom
                                type={BUTTON_VARIANT.NONE}
                                capitalizeType="none"
                                className="app-header-avatar"
                                ariaLabel={t('nav.accountMenuFor', { name: user.name })}
                                onClick={(e) => setMenuAnchor(e.currentTarget)}
                            >
                                {avatarContent}
                            </ButtonCustom>
                            <Menu
                                anchorEl={menuAnchor}
                                onClose={handleMenuClose}
                                paperClassName="user-menu"
                                fullScreenOnMobile
                            >
                                <div className="user-menu-header">
                                    <span className="user-menu-avatar">
                                        {avatarContent}
                                    </span>
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
                                    label={t('nav.account')}
                                    onClick={() => handleNavigate('/account')}
                                />
                                {showUpgradeLink && (
                                    <MenuActionItem
                                        icon={<StarRoundedIcon />}
                                        label={t('nav.upgradeToPro')}
                                        onClick={() => handleNavigate('/membership')}
                                    />
                                )}
                                {showSubscriptionLink && (
                                    <MenuActionItem
                                        icon={<WorkspacePremiumRoundedIcon />}
                                        label={t('nav.subscription')}
                                        onClick={() =>
                                            handleNavigate('/account#subscription')
                                        }
                                    />
                                )}
                                <MenuActionItem
                                    icon={<FlightTakeoffIcon />}
                                    label={t('nav.myTrips')}
                                    onClick={() => handleNavigate('/trips')}
                                />
                                <MenuActionItem
                                    icon={<AutoAwesomeRoundedIcon />}
                                    label={t('nav.planATrip')}
                                    onClick={() => handleNavigate('/discover')}
                                />
                                <MenuActionItem
                                    icon={<CheckCircleRoundedIcon />}
                                    label={t('nav.visitedPlaces')}
                                    onClick={() => handleNavigate('/visited')}
                                />
                                <MenuActionItem
                                    icon={<PublicRoundedIcon />}
                                    label={t('nav.travelAtlas')}
                                    onClick={() => handleNavigate('/atlas-map')}
                                />
                                <MenuActionItem
                                    icon={<FavoriteRoundedIcon />}
                                    label={t('nav.savedPlaces')}
                                    onClick={() => handleNavigate('/saved')}
                                />
                                <MenuActionItem
                                    icon={<AutoAwesomeRoundedIcon />}
                                    label={t('nav.bucketList')}
                                    onClick={() => handleNavigate('/bucket-list')}
                                />
                                <MenuActionItem
                                    icon={<PeopleOutlineIcon />}
                                    label={t('nav.manageFriends')}
                                    onClick={() => handleNavigate('/friends')}
                                />
                                <MenuActionItem
                                    icon={<HistoryRoundedIcon />}
                                    label={t('nav.recentSearches')}
                                    onClick={() => handleNavigate('/history')}
                                />
                                <MenuActionItem
                                    icon={<NotificationsNoneRoundedIcon />}
                                    label={t('nav.notifications')}
                                    onClick={() => handleNavigate('/notifications')}
                                />
                                {isAdmin && (
                                    <MenuActionItem
                                        icon={<AdminPanelSettingsRoundedIcon />}
                                        label={t('nav.adminDashboard')}
                                        onClick={() =>
                                            handleNavigate('/dashboard')
                                        }
                                    />
                                )}
                                <Divider className="user-menu-divider" />
                                <MenuActionItem
                                    icon={<LogoutRoundedIcon />}
                                    label={t('nav.logout')}
                                    onClick={handleLogout}
                                    tone="danger"
                                />
                            </Menu>
                        </>
                    ) : (
                        <>
                            <span className="auth-link">
                                <LoginBtn onClick={handleLogin} onSwitchToSignup={goToSignup} />
                            </span>
                            <span className="auth-cta">
                                <Link to="/signup" className="auth-cta-link">
                                    {t('nav.signUp')}
                                </Link>
                            </span>
                        </>
                    )}
                </nav>

                <IconButton
                    className="app-header-burger"
                    aria-label={t('nav.openMenu')}
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
                            aria-label={t('nav.closeMenu')}
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
                                        {avatarContent}
                                    </span>
                                    <span className="drawer-user-name">{user.name}</span>
                                </div>
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.account')}
                                    onClick={() => handleNavigate('/account')}
                                />
                                {showUpgradeLink && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link drawer-upgrade"
                                        label={t('nav.upgradeToPro')}
                                        onClick={() => handleNavigate('/membership')}
                                    />
                                )}
                                {showSubscriptionLink && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link"
                                        label={t('nav.subscription')}
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
                                    label={t('nav.myTrips')}
                                    onClick={() => handleNavigate('/trips')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.planATrip')}
                                    onClick={() => handleNavigate('/discover')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.visitedPlaces')}
                                    onClick={() => handleNavigate('/visited')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.savedPlaces')}
                                    onClick={() => handleNavigate('/saved')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.bucketList')}
                                    onClick={() => handleNavigate('/bucket-list')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.manageFriends')}
                                    onClick={() => handleNavigate('/friends')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.recentSearches')}
                                    onClick={() => handleNavigate('/history')}
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label={t('nav.notifications')}
                                    onClick={() => handleNavigate('/notifications')}
                                />
                                {isAdmin && (
                                    <ButtonCustom
                                        type={BUTTON_VARIANT.NONE}
                                        capitalizeType="none"
                                        className="drawer-link"
                                        label={t('nav.adminDashboard')}
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
                                    <LogoutRoundedIcon fontSize="small" /> {t('nav.logout')}
                                </ButtonCustom>
                            </>
                        ) : (
                            <>
                                <div className="drawer-auth">
                                    <LoginBtn onClick={handleLogin} onSwitchToSignup={goToSignup} />
                                </div>
                                <div className="drawer-auth signup">
                                    <Link
                                        to="/signup"
                                        className="drawer-link auth-cta-link"
                                        onClick={() => setDrawerOpen(false)}
                                    >
                                        {t('nav.signUp')}
                                    </Link>
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
