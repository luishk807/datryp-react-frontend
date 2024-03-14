import React, { useMemo } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';

import Trips from './Trips';

const DestinationDetail = ({
    destinations = []
}) => {

    const destinationData = useMemo(() => {
        return destinations ? destinations : null;
    }, [destinations]);
    
    return (
        <Grid container>
            {
                destinationData ? destinations.map((destination, indx) => (
                    <Grid item key={`destination-${indx}`} lg={12} className="trip-detail">
                        <Grid container>
                            <Grid item lg={12} className="header">
                                <Grid container>
                                    <Grid item className="icon">
                                        <span className="dot"></span>
                                    </Grid>
                                    <Grid item className="title">
                                        <span className="title">{moment(destination.date).format('LL')}</span>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Trips trips={destination.trips} />
                        </Grid>
                    </Grid>
                )) : (
                    <Grid item lg={12} className="trip-detail">
                       No trips
                    </Grid>
                )
            }
        </Grid>
    );
};

DestinationDetail.propTypes = {
    destinations: PropTypes.array
};

export default DestinationDetail;