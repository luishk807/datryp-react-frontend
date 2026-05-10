import { useState } from 'react';
import { Drawer, IconButton, Link } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';
import './index.css';

const Header = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <header className="app-header">
            <div className="app-header-inner">
                <Link href="/" className="app-header-logo" underline="none">
                    <img src="/images/logo.svg" alt="logo" />
                </Link>

                <nav className="app-header-nav">
                    <span className="auth-link">
                        <LoginBtn />
                    </span>
                    <span className="auth-cta">
                        <SignUp />
                    </span>
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
                        <div className="drawer-auth">
                            <LoginBtn />
                        </div>
                        <div className="drawer-auth signup">
                            <SignUp />
                        </div>
                    </div>
                </div>
            </Drawer>
        </header>
    );
};

export default Header;
