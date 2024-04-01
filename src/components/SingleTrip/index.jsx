import React, { useState } from 'react';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import DestinationDetail from '../DestinationDetail';
import PropTypes from 'prop-types';
import StepperComp from '../common/StepperComp';
import BasicInfo from '../DestinationDetail/BasicInfo';
import FriendPicker from '../DestinationDetail/FriendPicker';


const SingleTrip = ({
    tripInfo
}) => {
    console.log(tripInfo);
    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo />
        }, {
            label: 'Define the Trips',
            comp: <FriendPicker />
        }, {
            label: 'Finish',
            comp: <DestinationDetail startDate={tripInfo.startDate} endDate={tripInfo.endDate} destinations={tripInfo.destinations} />
        }
    ];

    return (
        <Layout>
            <Grid container className="singleTrip">
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp steps={steps} />
                </Grid>
            </Grid>
        </Layout>
    );
};

SingleTrip.propTypes = {
    tripInfo: PropTypes.object
};

export default SingleTrip;