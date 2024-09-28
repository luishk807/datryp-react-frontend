import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import './index.css';
import { connect } from 'react-redux';

export const Account = ({ user }) => {
    console.log("user", user);
    return(
        <Layout title="Account">
            <Grid container id="account-section" spacing={0}>
                <Grid item lg={12} md={12} xs={12}>
                        Welcome Luis
                </Grid>
            </Grid>
        </Layout>
    );
};

const mapStateToProps = (state, ownProps) => {
    return {
        user: state.prop
    };
};

Account.propTypes = {
    user: PropTypes.object,
};

export default connect(mapStateToProps)(Account);