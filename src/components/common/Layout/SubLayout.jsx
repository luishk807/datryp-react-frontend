
import React from 'react';
import { Grid } from '@mui/material';
import 'App.css';
import './index.css';
import PropTypes from 'prop-types';
import Footer from 'components/Footer';
import Header from 'components/Header/Subheader';
 
const Layout = ({children, title = ''}) => {
    return (
        <Grid container spacing={0} id="layout" className="root">
            {/* header */}
            <Header />
            <Grid item lg={8} md={12} xs={12} className="layout-container">
                <Grid container>
                    <Grid item lg={12} md={12} xs={12} className="layout-title">
                        {title}
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="homeContainer">
                        {/* body */}
                        { children }
                    </Grid>
                </Grid>
            </Grid>
            {/* footer */}
            <Footer />
        </Grid>
    );
};

Layout.propTypes = {
    children: PropTypes.node,
    title: PropTypes.string
};

export default Layout;