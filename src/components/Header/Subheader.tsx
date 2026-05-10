import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Drawer, IconButton, Link, Menu, MenuItem } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SearchBar from 'components/SearchBar';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';
import type { LoginForm } from 'components/common/LoginBtn';
import type { SignUpForm } from 'components/common/SignUpBtn';
import { TRIP_BASIC } from 'constants';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import { useUser } from 'context/UserContext';
import type { Country, Destination } from 'types/trip';
import './index.css';

const Header = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const { user, login, logout } = useUser();

    const handleSearchSelected = (country: Country) => {
        if (!country?.name) return;
        const type = TRIP_BASIC.SINGLE;
        const destinations = [{ country }] as Destination[];
        dispatch(resetTrip());
        dispatch(basicInfo({ type, destinations }));
        navigate(type.route, { replace: true });
    };

    const handleLogin = (form: LoginForm) => {
        const name = form.username || 'User';
        login({ id: name, name });
    };

    const handleSignUp = (form: SignUpForm) => {
        const name = form.name || form.username || 'User';
        login({ id: form.email || name, name, email: form.email });
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
    };

    const initial = user?.name.charAt(0).toUpperCase() ?? '?';

    return (
        <header className="app-header">
            <div className="app-header-inner with-search">
                <Link href="/" className="app-header-logo" underline="none">
                    <img src="/images/logo.svg" alt="logo" />
                </Link>

                <div className="app-header-search">
                    <SearchBar type="simple" onSelected={handleSearchSelected} />
                </div>

                <nav className="app-header-nav">
                    {user ? (
                        <>
                            <button
                                className="app-header-avatar"
                                onClick={(e) => setMenuAnchor(e.currentTarget)}
                                aria-label={`Account menu for ${user.name}`}
                            >
                                {initial}
                            </button>
                            <Menu
                                anchorEl={menuAnchor}
                                open={Boolean(menuAnchor)}
                                onClose={handleMenuClose}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                slotProps={{ paper: { className: 'user-menu' } }}
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
                                <MenuItem
                                    onClick={() => handleNavigate('/account')}
                                    className="user-menu-item"
                                >
                                    <PersonOutlineIcon fontSize="small" />
                                    Account
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleNavigate('/trips')}
                                    className="user-menu-item"
                                >
                                    <FlightTakeoffIcon fontSize="small" />
                                    My Trips
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleNavigate('/friends')}
                                    className="user-menu-item"
                                >
                                    <PeopleOutlineIcon fontSize="small" />
                                    Manage Friends
                                </MenuItem>
                                <Divider className="user-menu-divider" />
                                <MenuItem
                                    onClick={handleLogout}
                                    className="user-menu-item user-menu-logout"
                                >
                                    <LogoutRoundedIcon fontSize="small" />
                                    Logout
                                </MenuItem>
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
                                <button
                                    className="drawer-link"
                                    onClick={() => handleNavigate('/account')}
                                >
                                    Account
                                </button>
                                <button
                                    className="drawer-link"
                                    onClick={() => handleNavigate('/trips')}
                                >
                                    My Trips
                                </button>
                                <button
                                    className="drawer-link"
                                    onClick={() => handleNavigate('/friends')}
                                >
                                    Manage Friends
                                </button>
                                <button
                                    className="drawer-link drawer-logout"
                                    onClick={handleLogout}
                                >
                                    <LogoutRoundedIcon fontSize="small" /> Logout
                                </button>
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
