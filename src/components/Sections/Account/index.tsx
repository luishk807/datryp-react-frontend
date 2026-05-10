import React from 'react';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import './index.css';
import { useTripState } from 'context/TripContext';

export const Account = () => {
    const tripInfo = useTripState();
    console.log('account tripInfo', tripInfo);
    return (
        <Layout title="Account">
            <Grid container id="account-section" spacing={0}>
                <Grid item lg={12} md={12} xs={12}>
                    Welcome Luis
                </Grid>
            </Grid>
        </Layout>
    );
};

export default Account;
