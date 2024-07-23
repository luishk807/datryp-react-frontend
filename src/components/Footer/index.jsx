import React from 'react';
import { Grid } from '@mui/material';
import './index.css';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import XIcon from '@mui/icons-material/X';

const Footer = () => {
    return (
        <Grid container className="footer">
            <Grid item lg={12} md={12} xs={12} className="mainContainer">
                <Grid container>
                    <Grid item lg={12} md={12} xs={12} className="logo">
                        <div className="logo-container">
                            <img src="/images/logoWhite.svg" />
                        </div>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="links">
                        <ul>
                            <li>About Us</li>
                            <li>Contact Us</li>
                            <li>Terms of Use</li>
                            <li>Privacy Policy</li>
                        </ul>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="icons">
                        <hr/>
                        <InstagramIcon />
                        <FacebookIcon />
                    </Grid>
                </Grid>    
            </Grid> 
        </Grid>
    );
};

export default Footer;