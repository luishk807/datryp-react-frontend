import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import './index.css';
import { connect } from 'react-redux';

export const Account = ({ user }) => {
    console.log("user", user);
    return(
        <Layout>
            <div>
              test account
            </div>
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