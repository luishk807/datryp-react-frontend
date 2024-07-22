import React from 'react';
import { Grid } from '@mui/material';
import './index.css';

const Footer = () => {
    return (
        <Grid container className="footer">
            <Grid item lg={12} md={12} xs={12} className="mainContainer">
                <Grid container>
                    <Grid item lg={4} md={4} xs={12} >
                            DaTryp &copy; 2024
                    </Grid>
                    <Grid item lg={2} md={2} xs={12} >
                        <ul>
                            <li>About Us</li>
                            <li>Contact Us</li>
                            <li>Terms of Use</li>
                            <li>Privacy Policy</li>
                        </ul>
                    </Grid>
                    <Grid item lg={2} md={2} xs={12} >
                        <ul>
                            <li>My Account</li>
                            <li>test2</li>
                            <li>test2</li>
                        </ul>
                    </Grid>
                    <Grid item lg={2} md={2} xs={12} >
                        <ul>
                            <li>test2</li>
                            <li>test2</li>
                            <li>test2</li>
                        </ul>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className='mt-10'>
                        <hr/>
                        icons
                    </Grid>
                </Grid>    
            </Grid> 
        </Grid>
    );
};

export default Footer;