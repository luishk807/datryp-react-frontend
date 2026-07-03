/**
 * Mobile-only fixed bottom navigation. Hidden on tablet + desktop
 * (≥720px) where the header serves as the nav surface.
 *
 * Five slots:
 *   Home · Explore · TRIPS (centered CTA) · Bucket · Atlas
 *
 * (Account moved to the header avatar menu on mobile. The account
 * bottom-sheet below is retained but no longer triggered from the nav.)
 *
 * - Home: navigates to `/`.
 * - Explore: opens a full-viewport search overlay with the same
 *   place / AI mode toggle the homepage uses, so the user can
 *   search from anywhere without scrolling back to the hero.
 * - Trips: centered CTA tab. Routes to `/trips`.
 * - Bucket: navigates to `/bucket-list`. (Notifications moved to the
 *   header bell — the unread badge lives there on mobile now.)
 * - Account: opens a full-height bottom-sheet (MUI Drawer
 *   anchor="bottom") with the menu items the desktop avatar Menu
 *   carries: Account, My Trips, Saved/Visited, Bucket list, Friends,
 *   Subscription, Logout, etc.
 *
 * Mounted once at the App level so every page gets it for free.
 * Hidden for unauthenticated users — the auth flow lives on the
 * existing Header (Sign in / Sign up CTAs) and pushing them into a
 * bottom nav before they have an account would be hostile.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Drawer, Divider } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import SearchBar from 'components/SearchBar';
import MenuFooterLinks from 'components/common/MenuFooterLinks';
import { useUser } from 'context/UserContext';
import type { Country } from 'types';
import type { PlaceResult } from 'api/hooks/usePlaces';
import './index.scss';

// Local UI mode label. Matches the homepage hero toggle —
// `'place'` is the picker (cities + countries), `'describe'` is
// the AI-curated sentence search. The 'plan with AI' button is a
// separate sibling CTA, not a third toggle position.
type BottomNavSearchMode = 'place' | 'describe';

const BottomNav = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin, logout } = useUser();
    const [accountOpen, setAccountOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchMode, setSearchMode] =
        useState<BottomNavSearchMode>('place');

    // Lock body scroll while the full-viewport search overlay is open.
    // The overlay is a plain div (not a MUI Drawer, which handles this
    // automatically), so without this the page behind it remained
    // scrollable on mobile.
    //
    // iOS Safari quirk: `body { overflow: hidden }` alone is leaky —
    // when the search input is focused, iOS auto-scrolls to keep the
    // field on-screen and the background page scrolls behind the
    // overlay. The robust fix is to take the page out of the document
    // scroll flow entirely with `position: fixed`, snapshotting the
    // current scroll position so we can restore it on close. Same
    // pattern body-scroll-lock and react-remove-scroll use.
    useEffect(() => {
        if (!searchOpen) return;
        const scrollY = window.scrollY;
        const previousBodyStyles = {
            position: document.body.style.position,
            top: document.body.style.top,
            left: document.body.style.left,
            right: document.body.style.right,
            width: document.body.style.width,
            overflow: document.body.style.overflow,
        };
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.position = previousBodyStyles.position;
            document.body.style.top = previousBodyStyles.top;
            document.body.style.left = previousBodyStyles.left;
            document.body.style.right = previousBodyStyles.right;
            document.body.style.width = previousBodyStyles.width;
            document.body.style.overflow = previousBodyStyles.overflow;
            // Restore the scroll position the page was at before
            // we pinned the body — without this the page jumps to
            // the top when the overlay closes.
            window.scrollTo(0, scrollY);
        };
    }, [searchOpen]);

    // Search handlers — shared by the signed-in Explore overlay and the guest
    // Explore overlay below, so they live above the guest early-return.
    const handlePlaceSelected = (place: PlaceResult) => {
        if (!place?.countryCode) return;
        setSearchOpen(false);
        if (place.kind === 'country') {
            navigate(
                `/country?code=${encodeURIComponent(place.countryCode)}&mode=single`,
            );
            return;
        }
        navigate(
            `/city?name=${encodeURIComponent(place.name)}` +
                `&country=${encodeURIComponent(place.countryName)}` +
                `&code=${encodeURIComponent(place.countryCode)}` +
                `&mode=single`,
        );
    };

    const handleAiSearchSubmit = (q: string) => {
        setSearchOpen(false);
        navigate(`/search?q=${encodeURIComponent(q)}`);
    };

    // Signed-out users see a stripped-down version of the bottom nav
    // (Home + Sign in CTA). Returning `null` here used to strand mobile
    // users after logout — the bell would unmount with no replacement,
    // leaving the user with no way to navigate back to a logged-in
    // state without scrolling up to the header CTAs.
    if (!user) {
        const homeActive = location.pathname === '/';
        return (
            <>
                <nav
                    className="bottom-nav bottom-nav--guest"
                    aria-label="Primary navigation"
                >
                    <Link
                        to="/"
                        className={classNames('bottom-nav-item', {
                            'is-active': homeActive,
                        })}
                        aria-label={t('nav.home')}
                    >
                        <HomeRoundedIcon className="bottom-nav-icon" />
                        <span className="bottom-nav-label">
                            {t('nav.home')}
                        </span>
                    </Link>
                    <button
                        type="button"
                        className={classNames('bottom-nav-item', {
                            'is-active': searchOpen,
                        })}
                        onClick={() => setSearchOpen(true)}
                        aria-label={t('nav.explore')}
                    >
                        <SearchRoundedIcon className="bottom-nav-icon" />
                        <span className="bottom-nav-label">
                            {t('nav.explore')}
                        </span>
                    </button>
                </nav>

                {/* Guests get search too (place search → public city /
                    country pages). Simpler than the signed-in overlay —
                    just the field, no AI/shortcuts. */}
                {searchOpen && (
                    <div
                        className="bottom-nav-search-overlay"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('nav.search')}
                    >
                        <button
                            type="button"
                            className="bottom-nav-search-close"
                            aria-label={t('heroSearch.close')}
                            onClick={() => setSearchOpen(false)}
                        >
                            <CloseRoundedIcon />
                        </button>
                        <div className="bottom-nav-search-content">
                            <h2 className="bottom-nav-search-title">
                                {t('heroSearch.title')}
                            </h2>
                            <div className="bottom-nav-search-bar">
                                <SearchBar
                                    type="simple"
                                    mode="place"
                                    onPlaceSelected={handlePlaceSelected}
                                    onAiSearchSubmit={handleAiSearchSubmit}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    const showUpgradeLink = !isAdmin && !user.isPaidMember;
    const showSubscriptionLink = !isAdmin && user.isPaidMember;

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleNavigate = (path: string) => {
        setAccountOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        setAccountOpen(false);
        logout();
        navigate('/');
    };

    // No global "Plan new trip" FAB — detail pages already render
    // their own contextual "Start planning" / "Add to itinerary"
    // green pill, and a duplicate FAB stacked on top of that was
    // confusing. Trip creation is reachable via Home and via the
    // contextual CTA on detail pages.

    return (
        <>
            <nav
                className="bottom-nav"
                aria-label="Primary mobile navigation"
            >
                <button
                    type="button"
                    className={classNames('bottom-nav-item', {
                        'is-active': isActive('/'),
                    })}
                    onClick={() => navigate('/')}
                    aria-label={t('nav.home')}
                >
                    <HomeRoundedIcon className="bottom-nav-icon" />
                    <span>{t('nav.home')}</span>
                </button>

                <button
                    type="button"
                    className={classNames('bottom-nav-item', {
                        'is-active': searchOpen,
                    })}
                    onClick={() => setSearchOpen(true)}
                    aria-label={t('nav.explore')}
                >
                    <SearchRoundedIcon className="bottom-nav-icon" />
                    <span>{t('nav.explore')}</span>
                </button>

                <button
                    type="button"
                    className={classNames(
                        'bottom-nav-item',
                        'bottom-nav-item--primary',
                        {
                            'is-active': isActive('/trips'),
                        },
                    )}
                    onClick={() => navigate('/trips')}
                    aria-label={t('nav.myTrips')}
                >
                    <FlightTakeoffRoundedIcon className="bottom-nav-icon" />
                    <span>{t('nav.trips')}</span>
                </button>

                <button
                    type="button"
                    className={classNames('bottom-nav-item', {
                        'is-active': isActive('/bucket-list'),
                    })}
                    onClick={() => navigate('/bucket-list')}
                    aria-label={t('nav.bucketList')}
                >
                    <FavoriteRoundedIcon className="bottom-nav-icon" />
                    <span>{t('nav.bucket')}</span>
                </button>

                <button
                    type="button"
                    className={classNames('bottom-nav-item', {
                        'is-active': isActive('/atlas-map'),
                    })}
                    onClick={() => navigate('/atlas-map')}
                    aria-label={t('nav.travelAtlas')}
                >
                    <PublicRoundedIcon className="bottom-nav-icon" />
                    <span>{t('nav.atlas')}</span>
                </button>
            </nav>

            {/* ── Account sheet — full-height bottom drawer ──────── */}
            <Drawer
                anchor="bottom"
                open={accountOpen}
                onClose={() => setAccountOpen(false)}
                PaperProps={{ className: 'bottom-nav-account-paper' }}
            >
                <div className="bottom-nav-account">
                    <header className="bottom-nav-account-head">
                        <div className="bottom-nav-account-user">
                            <span className="bottom-nav-account-avatar">
                                {user.profileImageUrl ? (
                                    <img
                                        src={user.profileImageUrl}
                                        alt=""
                                    />
                                ) : (
                                    (user.name?.charAt(0).toUpperCase() ?? '?')
                                )}
                            </span>
                            <div className="bottom-nav-account-info">
                                <span className="bottom-nav-account-name">
                                    {user.name}
                                </span>
                                {user.email && (
                                    <span className="bottom-nav-account-email">
                                        {user.email}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="bottom-nav-account-close"
                            aria-label={t('nav.closeAccountMenu')}
                            onClick={() => setAccountOpen(false)}
                        >
                            <CloseRoundedIcon />
                        </button>
                    </header>

                    <Divider />

                    <ul className="bottom-nav-account-list">
                        <AccountItem
                            icon={<PersonOutlineRoundedIcon />}
                            label={t('nav.account')}
                            onClick={() => handleNavigate('/account')}
                        />
                        {showUpgradeLink && (
                            <AccountItem
                                icon={<StarRoundedIcon />}
                                label={t('nav.upgradeToPro')}
                                onClick={() =>
                                    handleNavigate('/membership')
                                }
                                tone="accent"
                            />
                        )}
                        {showSubscriptionLink && (
                            <AccountItem
                                icon={<WorkspacePremiumRoundedIcon />}
                                label={t('nav.subscription')}
                                onClick={() =>
                                    handleNavigate('/account#subscription')
                                }
                            />
                        )}
                        <AccountItem
                            icon={<FlightTakeoffRoundedIcon />}
                            label={t('nav.myTrips')}
                            onClick={() => handleNavigate('/trips')}
                        />
                        <AccountItem
                            icon={<AutoAwesomeRoundedIcon />}
                            label={t('nav.planATrip')}
                            onClick={() => handleNavigate('/discover')}
                        />
                        <AccountItem
                            icon={<CheckCircleRoundedIcon />}
                            label={t('nav.visitedPlaces')}
                            onClick={() => handleNavigate('/visited')}
                        />
                        <AccountItem
                            icon={<PublicRoundedIcon />}
                            label={t('nav.travelAtlas')}
                            onClick={() => handleNavigate('/atlas-map')}
                        />
                        <AccountItem
                            icon={<FavoriteRoundedIcon />}
                            label={t('nav.savedPlaces')}
                            onClick={() => handleNavigate('/saved')}
                        />
                        <AccountItem
                            icon={<AutoAwesomeRoundedIcon />}
                            label={t('nav.bucketList')}
                            onClick={() =>
                                handleNavigate('/bucket-list')
                            }
                        />
                        <AccountItem
                            icon={<EventNoteRoundedIcon />}
                            label={t('nav.notifications')}
                            onClick={() =>
                                handleNavigate('/notifications')
                            }
                        />
                        <AccountItem
                            icon={<PeopleOutlineRoundedIcon />}
                            label={t('nav.manageFriends')}
                            onClick={() => handleNavigate('/friends')}
                        />
                        <AccountItem
                            icon={<HistoryRoundedIcon />}
                            label={t('nav.recentSearches')}
                            onClick={() => handleNavigate('/history')}
                        />
                        {isAdmin && (
                            <AccountItem
                                icon={<AdminPanelSettingsRoundedIcon />}
                                label={t('nav.adminDashboard')}
                                onClick={() =>
                                    handleNavigate('/dashboard')
                                }
                            />
                        )}
                        <li className="bottom-nav-account-divider">
                            <Divider />
                        </li>
                        <AccountItem
                            icon={<LogoutRoundedIcon />}
                            label={t('nav.logout')}
                            onClick={handleLogout}
                            tone="danger"
                        />
                    </ul>
                    <Divider />
                    <MenuFooterLinks
                        onNavigate={handleNavigate}
                        className="bottom-nav-account-footer"
                    />
                </div>
            </Drawer>

            {/* ── Search overlay — translucent blue full-viewport ──── */}
            {searchOpen && (
                <div
                    className="bottom-nav-search-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('nav.search')}
                >
                    <button
                        type="button"
                        className="bottom-nav-search-close"
                        aria-label={t('heroSearch.close')}
                        onClick={() => setSearchOpen(false)}
                    >
                        <CloseRoundedIcon />
                    </button>
                    <div className="bottom-nav-search-content">
                        <h2 className="bottom-nav-search-title">
                            {t('heroSearch.title')}
                        </h2>

                        {/* Mode toggle — mirrors the homepage hero's
                            Place / Description pill so users see a
                            familiar UI without context switching.
                            "Search by" prefix collapses on phones via
                            CSS so the labels fit the narrow toggle. */}
                        <div
                            className={classNames(
                                'bottom-nav-search-toggle',
                                { 'is-describe': searchMode === 'describe' },
                            )}
                            role="tablist"
                            aria-label={t('heroSearch.modeAria')}
                        >
                            <span
                                className="bottom-nav-search-toggle-thumb"
                                aria-hidden="true"
                            />
                            <button
                                type="button"
                                role="tab"
                                aria-selected={searchMode === 'place'}
                                aria-label={t('heroSearch.byPlaceAria')}
                                className={classNames(
                                    'bottom-nav-search-toggle-btn',
                                    {
                                        selected: searchMode === 'place',
                                    },
                                )}
                                onClick={() => setSearchMode('place')}
                            >
                                <PublicRoundedIcon
                                    className="bottom-nav-search-toggle-icon"
                                    fontSize="small"
                                />
                                <span>
                                    <span className="bottom-nav-search-toggle-prefix">
                                        {t('heroSearch.searchByPrefix')}
                                    </span>
                                    {t('heroSearch.place')}
                                </span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={searchMode === 'describe'}
                                aria-label={t('heroSearch.byDescriptionAria')}
                                className={classNames(
                                    'bottom-nav-search-toggle-btn',
                                    { selected: searchMode === 'describe' },
                                )}
                                onClick={() => setSearchMode('describe')}
                            >
                                <SearchRoundedIcon
                                    className="bottom-nav-search-toggle-icon"
                                    fontSize="small"
                                />
                                <span>
                                    <span className="bottom-nav-search-toggle-prefix">
                                        {t('heroSearch.searchByPrefix')}
                                    </span>
                                    {t('heroSearch.description')}
                                </span>
                            </button>
                        </div>

                        <div className="bottom-nav-search-bar">
                            <SearchBar
                                type="simple"
                                mode={
                                    searchMode === 'describe'
                                        ? 'recommend'
                                        : 'place'
                                }
                                onPlaceSelected={handlePlaceSelected}
                                onAiSearchSubmit={handleAiSearchSubmit}
                            />
                        </div>

                        {/* "Let AI plan your trip" CTA — matches the
                            homepage hero callout so the third path
                            (real AI trip-builder) is one tap away
                            from the bottom-nav search too. Separated
                            from the toggle by an OR divider so it
                            doesn't read as a submit button for the
                            search input above. */}
                        <div
                            className="bottom-nav-search-or"
                            aria-hidden="true"
                        >
                            <span>{t('heroSearch.or')}</span>
                        </div>
                        <div className="bottom-nav-search-ai-callout">
                            <span className="bottom-nav-search-ai-callout-tagline">
                                {t('heroSearch.aiTagline')}
                            </span>
                            <Link
                                to="/discover"
                                className="bottom-nav-search-ai-cta"
                                aria-label={t('heroSearch.aiCtaAria')}
                                onClick={() => setSearchOpen(false)}
                            >
                                <AutoAwesomeRoundedIcon
                                    className="bottom-nav-search-ai-cta-icon"
                                    fontSize="small"
                                />
                                <span>{t('heroSearch.aiCta')}</span>
                                <span className="bottom-nav-search-ai-cta-badge">
                                    {t('heroSearch.pro')}
                                </span>
                            </Link>
                        </div>

                        <div className="bottom-nav-search-shortcuts">
                            <Link
                                to="/bucket-list"
                                className="bottom-nav-search-shortcut"
                                onClick={() => setSearchOpen(false)}
                            >
                                <AutoAwesomeRoundedIcon fontSize="small" />
                                <span>{t('nav.bucketList')}</span>
                            </Link>
                            <Link
                                to="/saved"
                                className="bottom-nav-search-shortcut"
                                onClick={() => setSearchOpen(false)}
                            >
                                <FavoriteRoundedIcon fontSize="small" />
                                <span>{t('nav.savedPlaces')}</span>
                            </Link>
                            <Link
                                to="/visited"
                                className="bottom-nav-search-shortcut"
                                onClick={() => setSearchOpen(false)}
                            >
                                <CheckCircleRoundedIcon fontSize="small" />
                                <span>{t('nav.visited')}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface AccountItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    tone?: 'default' | 'accent' | 'danger';
}

const AccountItem = ({
    icon,
    label,
    onClick,
    tone = 'default',
}: AccountItemProps) => (
    <li>
        <button
            type="button"
            className={classNames('bottom-nav-account-item', `tone-${tone}`)}
            onClick={onClick}
        >
            <span className="bottom-nav-account-item-icon">{icon}</span>
            <span className="bottom-nav-account-item-label">{label}</span>
        </button>
    </li>
);

export default BottomNav;
