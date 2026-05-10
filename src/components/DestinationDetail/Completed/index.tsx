import React from 'react';
import PropTypes from 'prop-types';
import {
    Step, 
    StepLabel, 
    Typography, 
    Grid 
} from '@mui/material';
import Confetti from 'components/Confetti';
import { useNavigate } from 'react-router-dom';
import './index.css';
import Button from 'components/common/FormFields/ButtonCustom';
const Complete = ({
    onReset
}) => {
    const history = useNavigate();
    const handleClick = (type) => {
        switch(type) {
            case 'home': {
                history('/');
                break;
            }
            case 'account': {
                history('/account');
                break;
            }
        }
    };
    return (
        <>
            <Grid container>
                <Grid item lg={6} xs={12} id='trip-complete'>
                    <Grid container className="trip-content">
                        <Grid item lg={12} xs={12} className='title'>
                            <Typography className='content'>
                                <span className="text-1">Congratulation! </span>
                                <span className="text-2">All Set!</span>
                            </Typography>
                        </Grid>
                        <Grid item lg={12} xs={12} className="main-image">
                            <img src="/images/complete.png" width="400" />
                        </Grid>
                        <Grid item lg={12} xs={12} className='button'>
                            <Grid container spacing={1}>
                                <Grid item xs={12} lg={6}>
                                    {/* <Button 
                                        type="line" 
                                        onClick={onReset} 
                                        label="Reset Trip"
                                    /> */}
                                    <Button 
                                        type="line" 
                                        onClick={() => handleClick('home')} 
                                        label="Return Home"
                                    />
                                </Grid>
                                <Grid item xs={12} lg={6}>
                                    <Button 
                                        type="line" 
                                        onClick={() => handleClick('account')} 
                                        label="View Your Trip"
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Confetti activate={true} />
        </>
    );
};

Complete.propTypes = {
    onReset: PropTypes.func
};
export default Complete;