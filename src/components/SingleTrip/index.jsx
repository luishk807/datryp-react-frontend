import React, { useState } from 'react';
import { connect } from 'react-redux';
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
    tripInfo,
    onBasicInfo
}) => {
    console.log(tripInfo);
    const handleBasicOnChange = (id, e) => {
        console.log("handle onchange", id, ':',e);
        onBasicInfo({ [id]: e.target.value});
    };

    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo onChange={handleBasicOnChange} />
        }, {
            label: 'Define the Trips',
            comp: <FriendPicker selectedOptions={tripInfo.friends} onChange={handleBasicOnChange}/>
        }, {
            label: 'Finish',
            comp: <DestinationDetail type={tripInfo.type} startDate={tripInfo.startDate} endDate={tripInfo.endDate} destinations={tripInfo.destinations} />
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


const mapStateToProps = (state) => ({
    tripInfo: state
});

const mapDispatchToProps = (dispatch) => ({
    onBasicInfo: (value) => dispatch({ type: "BASIC_INFO", payload: value})
});


SingleTrip.propTypes = {
    tripInfo: PropTypes.object,
    onBasicInfo: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(SingleTrip);