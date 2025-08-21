import React, { useState, useMemo} from 'react';
import moment from 'moment/moment';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import Activities from 'components/DestinationDetail/Activities';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import { REDUX_TYPE } from 'constants';

const Single = ({
    trips = null,
    participants = [],
    onChangePlace,
    onChangeBudget,
    isViewMode = false,
}) => {

    const [place, setPlace] = useState(null);
    const handleOnChange = (name, value) => {
        setPlace({
            [name]: value,
            ...place
        });
    };

    const endDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setPlace({
            ...place,
            'startDate': date
        });
        return date;
    }, []);

    const startDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setPlace({
            ...place,
            'startDate': date
        });
        return date;
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", place);
    };

    return (
        trips ? (
            <Activities 
                isViewMode={isViewMode}
                onChangePlace={onChangePlace}
                activities={trips} 
                onChangeBudget={onChangeBudget}
                participants={participants}
            />

        ) : (
            <AddPlaceBtn isViewMode={isViewMode} onChange={(e) => onChangePlace(REDUX_TYPE.ADD, e)} />
        )
    );
};

Single.propTypes = {
    onChangePlace: PropTypes.func,
    onChangeBudget: PropTypes.func,
    trips: PropTypes.array,
    participants: PropTypes.array,
    isViewMode: PropTypes.bool,
};

export default Single;