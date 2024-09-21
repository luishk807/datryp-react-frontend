import React from 'react';
import PropTypes from 'prop-types';
import {Step, StepLabel, Typography, Grid } from '@mui/material';
import Confetti from 'components/Confetti';
import './index.css';

const TripComplete = ({
    onClick
}) => {
    return (
        <div id="trip-complete">
            <div>
                <Typography sx={{mt: 2, mb: 1}}>
                            Congratulation! All Set!
                </Typography>
            </div>

            <div className="main-image">
                <img src="/images/complete.png" width="400" />
            </div>
            <Confetti activate={true} />
            <button onClick={onClick}>Reset</button>
        </div>
    );
};

TripComplete.propTypes = {
    onClick: PropTypes.func
};
export default TripComplete;