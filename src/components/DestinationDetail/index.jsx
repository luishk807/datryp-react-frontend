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

    const [dates, setDates] = useState([]);
    const getDatesRange = async() => {
        console.log(startDate, 'startdate');
        console.log(endDate, 'endDate');
        const date1 = moment(startDate);
        const date2 = moment(endDate);

        if (date1.isValid() && date2.isValid()) {
            if (moment(startDate).isSame(endDate)) {
                setDates([date2]);
                return;
            }
    
            let date = date1;
    
            const dateArry = [date.format('MM/DD/YYYY')];
    
            do {
                date = moment(date).add(1, 'day');
                dateArry.push(date.format('MM/DD/YYYY'));
            } while(date.isBefore(date2));
    
            console.log(dateArry, 'dates');
            setDates(dateArry);
        }
    };


    useEffect(() => {
        getDatesRange();
    }, [startDate, endDate]);

    const getDestinationData = (dateItem) => {
        const destinationDate = destinations.filter(item => item.date === dateItem);
        
        console.log("checking", destinationDate);

        const trips = destinationDate.length ? isMultiple ? destinationDate[0].trips : destinationDate[0].trips : null;
        return isMultiple ? <MutipleTrips trips={trips} /> : <SingleTrips trips={trips} />;
   
    };

    const destinationData = useMemo(() => {
        return destinations ? destinations : null;
    }, [destinations]);

    const isMultiple = useMemo(() => {
        return type === "multiple" ? true : false;
    }, [type]);
    
    return (
    // <Grid container>
    //     {
    //         destinationData ? destinations.map((destination, indx) => (
    //             <Grid item key={`destination-${indx}`} lg={12} md={12} xs={12} className="trip-detail">
    //                 <Grid container>
    //                     <Grid item lg={12} md={12} xs={12} className="header">
    //                         <Grid container>
    //                             <Grid item className="icon">
    //                                 <span className="dot"></span>
    //                             </Grid>
    //                             <Grid item className="title">
    //                                 <span className="title">{moment(destination.date).format('LL')}</span>
    //                             </Grid>
    //                         </Grid>
    //                     </Grid>
    //                     { isMultiple ? ( <MutipleTrips trips={destination.trips} />) : ( <SingleTrips trips={destination.activities} />) }
                           
        //                 </Grid>
        //             </Grid>
        //         )) : (
        //             <Grid item lg={12} className="trip-detail">
        //                No trips
        //             </Grid>
        //         )
        //     }
        // </Grid>
        <Grid container>
            {
                dates && dates.map((date, indx) => {
                    return (
                        <Grid item key={`destination-${indx}`} lg={12} className="trip-detail">
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
                })
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