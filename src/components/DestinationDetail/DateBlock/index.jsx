import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import moment from 'moment';
import MutipleTrips from '../Multiple';
import SingleTrips from '../Single';
import _ from 'lodash';
import './index.css';
import { isSingleTrip } from '../../../services';

const TripItemBlock = ({
    date,
    destinations = [],
    index = 0,
    typeId
}) => {
  
    const getDestinationData = (dateItem) => {
        console.log("destionation", destinations);
        console.log("check data", dateItem);
        let destinationDate = null;
        const isSingle = isSingleTrip(typeId);
        if (isSingle) {
            const intinerary = _.get(destinations, '0.itinerary');
            destinationDate = intinerary ? intinerary.filter(item => moment(dateItem).isSame(moment(item.date))) : [];
        } else {
            destinationDate = destinations.filter(item => item.date === dateItem);
        }
    
        const trips = destinationDate.length ? !isSingle ? destinationDate[0].itinerary
            : destinationDate[0].activities : null;
        console.log("trips", trips);
        return !isSingle ? <MutipleTrips trips={trips} /> : <SingleTrips trips={trips} />;

    };

    return (
        <Grid item key={`destination-${index}`} lg={12} className="trip-detail">
            <Grid container>
                <Grid item lg={12} className="header">
                    <Grid container>
                        <Grid item className="icon">
                            <span className="dot"></span>
                        </Grid>
                        <Grid item className="title">
                            <span className="title">{moment(date).format("LL")}</span>
                        </Grid>
                    </Grid>
                </Grid>
                {
                    getDestinationData(date)
                }                       
            </Grid>
        </Grid>
    );
};

TripItemBlock.propTypes = {
    date: PropTypes.object,
    destinations: PropTypes.array,
    index: PropTypes.number,
    typeId: PropTypes.number,
};
export default TripItemBlock;