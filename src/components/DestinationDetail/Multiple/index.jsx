import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import Activities from '../../DestinationDetail/Activities';
import AddDestinationBtn from '../../common/AddDestination';
import { REDUX_TYPE, TRIP_BASIC } from 'constants';
import _ from 'lodash';

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

    console.log("multiple destination", trips);
    return <>
        {
            trips && trips.map((trip, indx) => {
                const flightInfo = _.get(trip, 'flightInfo');
                const country = _.get(trip, 'country.name');
                const activities = _.get(trip, 'itinerary.0.activities');
                return (
                    <Grid key={`trip-${indx}`} item lg={12} md={12} xs={12} className="multrip-content-item">
                        <Grid container>
                            <Grid item lg={6} md={6} className="content-header">
                                <span className="title">Destination:</span>&nbsp; &nbsp;{country}
                            </Grid>
                            <Grid item lg={6} md={6} xs={12} className="flex justify-end justify-font-medium">
                                <span>Edit</span> / 
                                <span>Remove</span>
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="content-info"> 
                                <span className="title">Depart</span>: {flightInfo.departAirport} / {flightInfo.departFlight} - {flightInfo.departTime} - 
                                <span className="title">Arrive:</span> {flightInfo.arrivalAirport} / {flightInfo.arrivalFlight} - {flightInfo.arrivalTime}
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="activity-button">
                                <Activities 
                                    tripTypeId={TRIP_BASIC.MULTIPLE.id} 
                                    activities={activities} 
                                    onChangePlace={(type, e) => onChangePlace(type, e, indx)}
                                    participants={participants}
                                    onChangeBudget={(type, e) => onChangeBudget(type, e, indx)}
                                />
                            </Grid>

                        </Grid>
                    </Grid>
                );
            }) 
        }
               
        <Grid item lg={12} md={12} xs={12} className="multrip-content add-destination-button">
            <Grid container>
                <Grid item>
                    <AddDestinationBtn onChange={(e) => onChangeDestination(REDUX_TYPE.ADD, e)} />
                </Grid>
            </Grid>
        </Grid>
    </>;
};

Multiple.propTypes = {
    trips: PropTypes.array,
    onChangeDestination: PropTypes.func,
    participants: PropTypes.array,
    onChangeBudget: PropTypes.func,
    onChangePlace: PropTypes.func,
};

export default Multiple;