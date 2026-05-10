import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Grid } from '@mui/material';
import './index.css';
import { REDUX_TYPE, TRIP_BASIC } from 'constants';
import Activities from 'components/DestinationDetail/Activities';
import AddDestinationBtn from 'components/common/AddDestination';
import DialogBox from 'components/common/FormFields/DialogBox';


const Multiple = ({
    defaultDate,
    tripMaxDate,
    trips = [],
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
    isViewMode = false
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
                                <span className="title">Destination:</span>&nbsp; &nbsp;{country} - Flight: {flightInfo.flightNumber}
                            </Grid>
                            <Grid item lg={6} md={6} xs={12} className="flex justify-end justify-font-medium">
                                <span>
                                    <AddDestinationBtn 
                                        defaultDate={defaultDate}
                                        tripMaxDate={tripMaxDate}
                                        isViewMode={isViewMode}
                                        onChange={(e) => onChangeDestination(REDUX_TYPE.EDIT, e)} 
                                        type="edit"
                                        buttonType="text" 
                                        data={trip}
                                    /> 
                                </span>
                                &#47;
                                <span>
                                    <DialogBox 
                                        isViewMode={isViewMode}
                                        title="Delete this destination" 
                                        buttonLabel="Delete"
                                        buttonType="text"
                                        onConfirm={(e) => onChangeDestination(REDUX_TYPE.DELETE, trip.id)}
                                    >
                                        You are about to delete {country}.  Are you sure you want to delete this item
                                    </DialogBox>
                                </span>  
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="content-info"> 
                                <span className="title">Depart</span>: {flightInfo.departAirport} - {flightInfo.departTime} - 
                                <span className="title">Arrive:</span> {flightInfo.arrivalAirport} - {flightInfo.arrivalTime}
                            </Grid>
                            <Grid item lg={12} md={12} xs={12} className="activity-button">
                                <Activities 
                                    isViewMode={isViewMode}
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
        {
            !trips && (
                <Grid item lg={12} md={12} xs={12} className="multrip-content add-destination-button">
                    <Grid container>
                        <Grid item>
                            <AddDestinationBtn 
                                tripMaxDate={tripMaxDate}
                                isViewMode={isViewMode} 
                                defaultDate={defaultDate}
                                onChange={(e) => onChangeDestination(REDUX_TYPE.ADD, e)} 
                            />
                        </Grid>
                    </Grid>
                </Grid>
            )
        }

    </>;
};

Multiple.propTypes = {
    tripMaxDate: PropTypes.string,
    defaultDate: PropTypes.string,
    trips: PropTypes.array,
    onChangeDestination: PropTypes.func,
    participants: PropTypes.array,
    onChangeBudget: PropTypes.func,
    onChangePlace: PropTypes.func,
    isViewMode: PropTypes.bool
};

export default Multiple;