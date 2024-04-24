import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import './index.css';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ButtonIcon from '../../ButtonIcon';
import Activities from '../Activities';

const Single = ({
    trips = null
}) => {
    return (
        trips ? (
            <Grid item lg={12} className="content">
                <Activities activities={trips} />
            </Grid>

        )
            : (
                <Grid item lg={12} className="content item-border">
                    <Grid container>
                        <Grid item>
                            <ButtonIcon title="Add Places" Icon={AddCircleIcon} />
                        </Grid>
                    </Grid>
                </Grid>
            )
    );
};

Single.propTypes = {
    trips: PropTypes.array
};

export default Single;