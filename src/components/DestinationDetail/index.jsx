import React, { useEffect, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import _ from 'lodash';
import './index.css';

import DateBlock from './DateBlock';
const DestinationDetail = ({
    destinations = [],
    type={},
    startDate = null,
    endDate = null,
    participants = [],
    onChangeBudget,
    onChangePlace,
    onChangeDestination,
    isViewMode = false
}) => {

    console.log("destinations", destinations);
    const [dates, setDates] = useState([]);

    const getDatesRange = async() => {
        console.log("**************************getDatesRange******************");
        console.log(startDate, 'startdate');
        console.log(endDate, 'endDate');
        const date1 = moment(startDate);
        const date2 = moment(endDate);

        if (date1.isValid() && date2.isValid()) {
            if (moment(startDate).isSame(endDate)) {
                setDates([{startDate: date2, endDate: date2}]);
                return;
            }
    
            let date = date1;
    
            const dateArry = [{ 
                startDate: date.format('MM/DD/YYYY'), 
                endDate: date.format('MM/DD/YYYY') 
            }];

            let flagDate = null;
            let destinationDateFlag = null;
    
            do {
                if(!flagDate) {
                    const tripData = destinations.filter(item => moment(item.startDate).isSame(date));
                
                    destinationDateFlag = _.get(tripData, '0.startDate');
                    const destinationDateEnd = _.get(tripData, '0.endDate');

                    if (!moment(destinationDateFlag).isSame(destinationDateEnd)) {
                        console.log("***********DISFERETENT1 DATES**********");
                        console.log("****DESTINATION DATE 1: ", destinationDateFlag);
                        console.log("****DESTINATION DATE 2: ", destinationDateEnd);
                        flagDate = destinationDateEnd;
                    }
                }

                date = moment(date).add(1, 'day');

                if (flagDate) {
                    dateArry.forEach(item => {
                        if(moment(item.startDate).isSame(destinationDateFlag)) {
                            item.endDate = moment(flagDate).format('MM/DD/YYYY');
                        }
                    });

                    if (moment(date).isAfter(flagDate)) {
                        dateArry.push({ 
                            startDate: date.format('MM/DD/YYYY'), 
                            endDate: date.format('MM/DD/YYYY') 
                        });
                        flagDate = null;
                    }
                } else {
                    dateArry.push({ 
                        startDate: date.format('MM/DD/YYYY'), 
                        endDate: date.format('MM/DD/YYYY') 
                    });
                }

            } while(date.isBefore(date2));

            console.log(dateArry, 'dates');
            setDates(dateArry);
        }
    };


    useEffect(() => {
        getDatesRange();
    }, [destinations]);

    useEffect(() => {
        getDatesRange();
    }, [startDate, endDate]);

    const handleChangeDestination = (obj) => {
        onChangeDestination && onChangeDestination(obj);
    };

    return (
        <Grid container>
            {
                dates && dates.map((date, indx) => {
                    return (
                        <DateBlock 
                            isViewMode={isViewMode}
                            key={indx} 
                            index={indx} 
                            tripMaxDate={endDate}
                            participants={participants}
                            typeId={type.id}
                            startDate={date.startDate}
                            endDate={date.endDate}
                            destinations={destinations}
                            onChangeBudget={
                                (type, value, destinationIndx) => onChangeBudget(
                                    {
                                        activity: {type, value, index: indx, destinationIndx}, date: moment(date.startDate).format('YYYY-MM-DD').toString()
                                    }
                                )} 
                            // onChangePlace={
                            //     (type, value, destinationIndx) => onChangePlace(
                            //         {
                            //             activity: {type, value, index: indx, destinationIndx}, date: moment(date.startDate).format('YYYY-MM-DD').toString()
                            //         }
                            //     )}
                            onChangePlace={
                                (type, value, destinationIndx) => onChangePlace(
                                    {
                                        activity: {type, value, index: 0, destinationIndx: indx}, date: moment(date.startDate).format('YYYY-MM-DD').toString()
                                    }
                                )}
                            // onChangeDestination={(type, value) => onChangeDestination({activity: {type, value, index: indx}, date: moment(date).format('YYYY-MM-DD').toString()})}

                            onChangeDestination={(type, value) => {
                                handleChangeDestination({
                                    activity: {type, value, index: indx}, 
                                    startDate: moment(date.startDate).format('YYYY-MM-DD').toString(),
                                    endDate: moment(value?.flightInfo?.arrivalDate).format('YYYY-MM-DD').toString()
                                });
                            }}

                        />
                    );
                })
            }
        </Grid>
    );
};

DestinationDetail.propTypes = {
    destinations: PropTypes.array,
    type: PropTypes.object,
    participants: PropTypes.array,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    onChangeBudget: PropTypes.func,
    onChangePlace: PropTypes.func,
    onChangeDestination: PropTypes.func,
    isViewMode: PropTypes.bool,
};

export default DestinationDetail;