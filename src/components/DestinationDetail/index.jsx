import React, { useMemo } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';

import MutipleTrips from './Multiple';
import SingleTrips from './Single';

const DestinationDetail = ({
    destinations = [],
    type = "multiple"
}) => {

    const destinationData = useMemo(() => {
        return destinations ? destinations : null;
    }, [destinations]);

    const isMultiple = useMemo(() => {
        return type === "multiple" ? true : false;
    }, [type]);
    
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
                            { isMultiple ? ( <MutipleTrips trips={destination.trips} />) : ( <SingleTrips trips={destination.activities} />) }
                           
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
    destinations: PropTypes.array,
    type: PropTypes.string,
};

export default DestinationDetail;