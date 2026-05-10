import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, IconButton, Link, Menu, MenuItem } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';
import { useUser } from 'context/UserContext';
import type { LoginForm } from 'components/common/LoginBtn';
import type { SignUpForm } from 'components/common/SignUpBtn';
import './index.css';

const Header = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { user, login, logout } = useUser();
    const navigate = useNavigate();

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
            <div className="app-header-inner">
                <Link href="/" className="app-header-logo" underline="none">
                    <img src="/images/logo.svg" alt="logo" />
                </Link>

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
                            >
                                <MenuItem disabled className="app-header-menu-name">
                                    {user.name}
                                </MenuItem>
                                <MenuItem onClick={() => handleNavigate('/account')}>
                                    Account
                                </MenuItem>
                                <MenuItem onClick={() => handleNavigate('/trips')}>
                                    My Trips
                                </MenuItem>
                                <MenuItem onClick={handleLogout}>
                                    <LogoutRoundedIcon fontSize="small" style={{ marginRight: 8 }} />
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
