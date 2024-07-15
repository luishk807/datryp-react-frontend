import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import Activities from 'components/DestinationDetail/Activities';
import AddPlaceBtn from 'components/common/AddPlaceBtn';

const Single = ({
    trips = null,
    onChange,
    onSavePlace,
    onDeletePlace,
    participants = [],
}) => {
    console.log(trips, 'trips single');
    return (
        trips ? (
            <Grid item lg={12} md={12} xs={12} className="content item-border">
                <Activities 
                    onSavePlace={onSavePlace} 
                    onDeletePlace={onDeletePlace} 
                    activities={trips} 
                    onChange={onChange}
                    participants={participants}
                />
            </Grid>

        )
            : 
            (
                <Grid item lg={12} md={12} xs={12} className="content item-border">
                    <AddPlaceBtn onChange={onChange} />
                </Grid>
            )
    );
};

Single.propTypes = {
    trips: PropTypes.array,
    onChange: PropTypes.func,
    onSavePlace: PropTypes.func,
    onDeletePlace: PropTypes.func,
    participants: PropTypes.array,
};

export default Single;