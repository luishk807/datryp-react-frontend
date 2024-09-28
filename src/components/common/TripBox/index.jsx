import React from 'react';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import './index.css';

export const TripBox = ({
    data = null
}) => {
    return(
        <a href='/'>
            <Grid container id="trip-box">
                <Grid item lg={12} md={12} xs={12} className="container">
                    <Grid item lg={12} md={12} xs={12} className='image'>
                        <img src="/images/sample/china1.jpg" />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className='content'>
                        <ul>
                            <li className="title">Name: China Trip</li>
                            <li>Orgnizer: Joanna</li>
                            <li>Date: 10 Oct - 12 Oct 2024</li>
                            <li>Status: Active</li>
                        </ul>
                    </Grid>
                </Grid>
            </Grid>
        </a>
    );
};

TripBox.propTypes = {
    data: PropTypes.object
};

export default TripBox;