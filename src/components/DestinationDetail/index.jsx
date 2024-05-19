import React, { useEffect, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
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
    onChangeDestination
}) => {

    console.log("destinations", destinations);
    const [dates, setDates] = useState([]);
    // const handleOnChange = (e) => {
    //     console.log("getting out", e);
    //     onChange && onChange(e);
    // };
    
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
    
    return (
        <Grid container>
            {
                dates && dates.map((date, indx) => {
                    return (
                        <DateBlock 
                            key={indx} 
                            index={indx} 
                            participants={participants}
                            typeId={type.id}
                            date={moment(date)}
                            destinations={destinations}
                            onChangeBudget={(type, value) => onChangeBudget({activity: {type, value, index: indx}, date: moment(date).format('YYYY-MM-DD').toString()})} 
                            onChangePlace={(type, value) => onChangePlace({activity: {type, value, index: indx}, date: moment(date).format('YYYY-MM-DD').toString()})}
                            onChangeDestination={(type, value) => onChangeDestination({activity: {type, value, index: indx}, date: moment(date).format('YYYY-MM-DD').toString()})}
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
};

export default DestinationDetail;