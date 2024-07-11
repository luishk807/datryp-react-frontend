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
    onChange,
    onSavePlace,
    onDeletePlace,
}) => {

    console.log("destinations", destinations);
    const [dates, setDates] = useState([]);
    const handleOnChange = (e) => {
        console.log("getting out", e);
        onChange && onChange(e);
    };
    
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
    
    return (
        <Grid container>
            {
                dates && dates.map((date, indx) => {
                    return (
                        <DateBlock 
                            key={indx} 
                            index={indx} 
                            typeId={type.id}
                            date={moment(date)}
                            destinations={destinations}
                            onSavePlace={onSavePlace} 
                            onDeletePlace={onDeletePlace} 
                            onChange={(e) => handleOnChange({activity: e, date: date.format('YYYY-MM-DD').toString()})}
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
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    onChange: PropTypes.func,
    onSavePlace: PropTypes.func,
    onDeletePlace: PropTypes.func,
};

export default DestinationDetail;