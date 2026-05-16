import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Drawer, IconButton, Menu, MenuItem } from '@mui/material';
import classnames from 'classnames';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';
import SearchBar from 'components/SearchBar';
import IconLink from 'components/common/IconLink';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useUser } from 'context/UserContext';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import type { LoginForm } from 'components/common/LoginBtn';
import type { SignUpForm } from 'components/common/SignUpBtn';
import { MIN_SIGNUP_AGE, yearsSince } from 'utils/age';
import { BUTTON_VARIANT, LOGO_IMAGE, TRIP_BASIC } from 'constants';
import type { Country, Destination } from 'types';
import './index.scss';

interface HeaderProps {
    /** Renders a search bar between the logo and the nav (was the old Subheader). */
    withSearch?: boolean;
}

const Header = ({ withSearch = false }: HeaderProps) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { user, login, signup, logout } = useUser();
    const navigate = useNavigate();
    const dispatch = useTripDispatch();

    const handleSearchSelected = (country: Country) => {
        if (!country?.name) return;
        const type = TRIP_BASIC.SINGLE;
        const destinations = [{ country }] as Destination[];
        dispatch(resetTrip());
        dispatch(basicInfo({ type, destinations }));
        navigate(type.route, { replace: true });
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
        const dob = form.dob;
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        if (!dob) {
            throw new Error('Date of birth is required.');
        }
        if (yearsSince(dob) < MIN_SIGNUP_AGE) {
            throw new Error(
                `You must be at least ${MIN_SIGNUP_AGE} years old to create an account.`
            );
        }
        await signup({
            email,
            password,
            dob,
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
                                <ButtonCustom
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="drawer-link"
                                    label="Account"
                                    onClick={() => handleNavigate('/account')}
                                />
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
                                    label="Manage Friends"
                                    onClick={() => handleNavigate('/friends')}
                                />
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
