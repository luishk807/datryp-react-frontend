import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import moment from 'moment';
import MutipleTrips from 'components/DestinationDetail/Multiple';
import SingleTrips from 'components/DestinationDetail/Single';
import _ from 'lodash';
import './index.css';
import { isSingleTrip } from 'utils';

const TripItemBlock = ({
    date,
    destinations = [],
    participants = [],
    index = 0,
    typeId,
    onChangeBudget,
    onChangePlace,
    onChangeDestination,
    isViewMode = false,
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
            destinationDate = destinations.length ? destinations.filter(item => moment(dateItem).isSame(moment(item.date))) : [];

            console.log("destinationDate", destinationDate);
        }

        let trips = null;

        if (destinationDate.length) {
            trips = !isSingle ? destinationDate
                : destinationDate[0].activities;
        }

        console.log("trips", trips);
        
        return !isSingle ? 
            <MutipleTrips 
                isViewMode={isViewMode}
                trips={trips} 
                onChangePlace={onChangePlace}
                onChangeDestination={onChangeDestination}
                participants={participants}
                onChangeBudget={onChangeBudget} 
            /> : 
            <SingleTrips 
                isViewMode={isViewMode}
                onChangePlace={onChangePlace}
                participants={participants}
                onChangeBudget={onChangeBudget} 
                trips={trips} 
            />;

    };

    return (
        <Grid item key={`destination-${index}`} lg={12} md={12} xs={12}className="date-block">
            <Grid container>
                <Grid item lg={12} md={12} xs={12} className="header">
                    <Grid container>
                        <Grid item className="icon">
                            <span className="dot"></span>
                        </Grid>
                        <Grid item className="title">
                            <span className="title">{moment(date).format("LL")}</span>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item lg={12} md={12} xs={12} className='content item-border'>
                    <Grid container>
                        {
                            getDestinationData(date)
                        }  
                    </Grid>
 
                </Grid>
                    
            </Grid>
        </Grid>
    );
};

TripItemBlock.propTypes = {
    date: PropTypes.object,
    destinations: PropTypes.array,
    index: PropTypes.number,
    typeId: PropTypes.number,
    participants: PropTypes.array,
    onChangeBudget: PropTypes.func,
    onChangePlace: PropTypes.func,
    onChangeDestination: PropTypes.func,
    isViewMode: PropTypes.bool
};
export default TripItemBlock;