import React from 'react';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Grid, Link, Hidden } from '@mui/material';
import SearchBar from '../SearchBar';
import './index.css';

const Header = () => {
    return (
        <Grid container className="homeHeader" spacing={0} >
            <Grid item lg={3} md={3} xs={12} className="logoSection justify-center lg:justify-start">
                <Link href="/"><img src="/images/logo.svg" alt="logo" width="150" /></Link>
            </Grid>
            <Grid item lg={9} md={9} xs={12} className="loginSection">
                <Grid container className="loginContainer" spacing={0} >
                    <Hidden smDown>
                        <Grid item className="firstRow" lg={12} md={12}>
                            <p>Login / Sign Up</p>
                        </Grid>
                    </Hidden>
                    <Hidden smDown>
                        <Grid item className="secondRow" lg={12} md={12}>
                            <SearchBar />
                        </Grid>
                    </Hidden>
                    <Hidden lgUp mdUp>
                        <Grid item className="iconContainer">
                            <div>
                                <MenuRoundedIcon color="primary" className="menuIcon" />
                            </div>
                        </Grid>
                    </Hidden>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Header;