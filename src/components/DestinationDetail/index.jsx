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

                console.log("FLAG DATE:", flagDate);
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
        console.log("******handleChangeDestination********", obj);
        console.log("destinations", destinations);
        const ignoreId = _.get(obj, 'activity.value.id');
        const flagStartDate = _.get(obj, 'startDate');
        const flagEndDate = _.get(obj, 'endDate');
        console.log("Ignroe id", ignoreId);
        console.log("flagStartDate", flagStartDate);
        console.log("flagEndDate", flagEndDate);
        const indxList = [];
        for(let i = 0; i < destinations.length; i++) {
            console.log("COMPAREING", destinations[i]);
            if (
                ignoreId != destinations[i].id &&
                (
                    (
                        moment(destinations[i].startDate).isAfter(flagStartDate) ||
                        moment(destinations[i].startDate).isSame(flagStartDate)
                    )
                    &&
                    (
                        moment(destinations[i].endDate).isBefore(flagEndDate) ||
                        moment(destinations[i].endDate).isSame(flagEndDate)
                    )
                )
            ) {
                console.log("in here");
                indxList.push(destinations[i].id);
            } else {
                console.log("not in here");
            }
        }

        onChangeDestination && onChangeDestination({
            ...obj,
            removeIndexes: indxList
        });
    };

    const handleChangePlace = (obj) => {
        const { activity, date } = obj;
        console.log("*********HANDLE CHANGE PLACE************");
        console.log("SENDING", obj);
        console.log("destinations", destinations);
        let destIndx = null;
        for(let i = 0; i < destinations.length; i++) {
            if(moment(destinations[i].startDate).isSame(obj.date)) {
                destIndx = i;
                break;
            }
        }

        onChangePlace && onChangePlace({
            activity: {
                destinationIndx: destIndx,
                index: 0,
                ...activity
            }, 
            date
        });
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
                                (type, value) => handleChangePlace(
                                    {
                                        activity: {type, value}, date: moment(date.startDate).format('YYYY-MM-DD').toString()
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