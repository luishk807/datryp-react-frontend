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
}) => {
    console.log(trips, 'trips single');
    return (
        trips ? (
            <Grid item lg={12} className="content item-border">
                <Activities 
                    onSavePlace={onSavePlace} 
                    onDeletePlace={onDeletePlace} 
                    activities={trips} 
                    onChange={onChange}
                />
            </Grid>

        )
            : 
            (
                <Grid item lg={12} className="content item-border">
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
};

export default Single;