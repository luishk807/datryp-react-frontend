import React, { useState } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import DestinationDetail from '../DestinationDetail';
import PropTypes from 'prop-types';
import StepperComp from '../common/StepperComp';

const Tester = () => {
    return (<h1>tester</h1>);
};
const steps = [
    {
        label: 'Describe Your Trip!',
        comp: <Tester />
    }, {
        label: 'Define the Trips',
        comp: null
    }, {
        label: 'Finish',
        comp: null
    }
];

const SingleTrip = ({
    tripInfo
}) => {
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