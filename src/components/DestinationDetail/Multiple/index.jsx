import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import Activities from '../../DestinationDetail/Activities';
import AddDestinationBtn from '../../common/AddDestination';

const Multiple = ({
    trips = [],
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
}) => {
    const handleOnClick = (e) => {
        console.log("on click", e);
    };

    return (
        trips ? trips.map((trip, indx) => (
            <Grid key={`trip-${indx}`} item lg={12} className="content">
                <Grid container>
                    <Grid item lg={6} md={6} className="content-header">
                        <span className="title">Destination:</span> {trip.name}
                    </Grid>
                    <Grid item lg={6} md={6} className="flex justify-font-medium">
                        <span>Edit</span> / 
                        <span>Remove</span>
                    </Grid>
                    <Grid item lg={12} md={12} className="content-info"> 
                        <span className="title">Depart</span>: {trip.departAirport} / {trip.departFlight} - {trip.departTime} - 
                        <span className="title">Arrive:</span> {trip.arrivalAirport} / {trip.arrivalFlight} - {trip.arrivalTime}
                    </Grid>
                    <Activities activities={trip.activities} />
                </Grid>
            </Grid>
        )) : (
            <Grid item lg={12} className="content item-border">
                <Grid container>
                    <Grid item>
                        <AddDestinationBtn onChange={handleOnClick} />
                    </Grid>
                </Grid>
            </Grid>
        )
    );
};

Multiple.propTypes = {
    trips: PropTypes.array,
    onChangeDestination: PropTypes.func,
    participants: PropTypes.array,
    onChangeBudget: PropTypes.func,
    onChangePlace: PropTypes.func,
};

export default Multiple;