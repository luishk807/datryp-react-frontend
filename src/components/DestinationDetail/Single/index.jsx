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
}) => {
    console.log(trips, 'trips single');
    return (
        trips ? (
            <Activities 
                onChangePlace={onChangePlace}
                activities={trips} 
                onChangeBudget={onChangeBudget}
                participants={participants}
            />

        ) : (
            <AddPlaceBtn onChange={(e) => onChangePlace(REDUX_TYPE.ADD, e)} />
        )
    );
};

Single.propTypes = {
    onChangePlace: PropTypes.func,
    onChangeBudget: PropTypes.func,
    trips: PropTypes.array,
    participants: PropTypes.array,

};

export default Single;