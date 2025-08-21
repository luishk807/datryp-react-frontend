import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import Activities from 'components/DestinationDetail/Activities';
import AddPlaceBtn from 'components/common/AddPlaceBtn';

const Single = ({
    trips = null
}) => {
    console.log(trips, 'trips single');
    return (
        trips ? (
            <Grid item lg={12} className="content">
                <Activities activities={trips} />
            </Grid>

        )
            : (
                <Grid item lg={12} className="content item-border">
                    <AddPlaceBtn />
                </Grid>
            )
    );
};

Single.propTypes = {
    trips: PropTypes.array
};

export default Single;