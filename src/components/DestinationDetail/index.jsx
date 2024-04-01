import React, { useMemo, useEffect, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';

import MutipleTrips from './Multiple';
import SingleTrips from './Single';

const DestinationDetail = ({
    destinations = [],
    type = "multiple",
    startDate = null,
    endDate = null
}) => {

    const [dates, setDates] = useState();
    const getDatesRange = async() => {
        const date1 = moment(startDate);
        const date2 = moment(endDate);

        if (date1.isValid() && date2.isValid()) {
            if (moment(startDate).isSame(endDate)) {
                return [date2];
            }
    
            let date = date1;
    
            const dateArry = [date.format('LL')];
    
            do {
    
                date = moment(date).add(1, 'day');
                dateArry.push(date.format('LL'));
            } while(date.isBefore(date2));
    
            console.log(dateArry, 'dates');
            setDates(dateArry);
        }
    };


    useEffect(() => {
        getDatesRange();
    }, [startDate, endDate]);


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
    startDate: PropTypes.string,
    endDate: PropTypes.string
};

export default DestinationDetail;