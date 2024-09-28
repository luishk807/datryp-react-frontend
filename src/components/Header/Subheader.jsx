import React from 'react';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Grid, Link } from '@mui/material';
import SearchBar from 'components/SearchBar';
import './index.css';
import LoginBtn from 'components/common/LoginBtn';
import SignUp from 'components/common/SignUpBtn';

const Header = () => {
    return (
        <Grid container className="homeHeader" spacing={0} >
            <Grid item lg={3} md={3} xs={12} className="logoSection justify-center lg:justify-start">
                <Link href="/"><img src="/images/logo.svg" alt="logo" width="150" /></Link>
            </Grid>
            <Grid item lg={9} md={9} xs={12} className="loginSection">
                <Grid container className="loginContainer" spacing={0} >
                    <Grid item className="firstRow" lg={12} md={12} sx={{ display: {
                        lg: 'flex',
                        md: 'flex',
                        xs: 'none'
                    }}}>
                        <LoginBtn />
                        &nbsp; &#x2f; &nbsp;                       
                        <SignUp />
                    </Grid>
                
                    <Grid item className="secondRow" lg={12} md={12} xs={12}>
                        <SearchBar className='justify-start' />
                    </Grid>
                    <Grid item className="iconContainer" sx={{ display: {
                        xs: 'flex',
                        lg: 'none',
                        md: 'none'
                    }}}>
                        <div>
                            <MenuRoundedIcon color="primary" className="menuIcon" />
                        </div>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Header;