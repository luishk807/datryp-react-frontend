import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import TripBox from 'components/common/TripBox';
import './index.css';

export const Trips = (props) => {
    return(
        <Layout title='My Trips'>
            <Grid container id="trip-container">
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
                <Grid item className="trip-item" sx={{ flexBasis: { 
                    lg: 'calc(100% / 3)',
                    xs: 'calc(100% / 1)',
                    md: 'calc(100% / 3)',
                } }}>
                    <TripBox />
                </Grid>
            </Grid>

        </Layout>
    );
};

export default Trips;