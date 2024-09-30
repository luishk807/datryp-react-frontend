import React from 'react';
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
    console.log(trips, 'trips single');
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