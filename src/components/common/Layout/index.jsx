
import React from 'react';
import { Grid } from '@mui/material';
import '../../../App.css';
import PropTypes from 'prop-types';
import Footer from '../../Footer';
import Header from '../../Header';
 
const Layout = ({children}) => {
    return (
        <Grid container spacing={0} className="root">
            {/* header */}
            <Header />
            <Grid item lg={12} md={12} className="homeContainer">
                {/* body */}
                { children }
            </Grid>

            {/* footer */}
            <Footer />
        </Grid>
    );
};

Layout.propTypes = {
    children: PropTypes.node
};

export default Layout;