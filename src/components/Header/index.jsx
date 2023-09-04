import React from 'react';
import { Grid } from '@mui/material';
import './index.css';

const Header = () => {
    return (
        <Grid container className="homeHeader" spacing={0} >
            <Grid item lg={3} md={3} xs={12}>
                <img src="/images/logo.svg" alt="logo" width="150" />
            </Grid>
            <Grid item lg={9} md={9} xs={12}>
                <Grid container style={{display: 'flex'}} spacing={0} >
                    <Grid item className="firstRow" lg={12}>
                        Login / Sign Up
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Header;