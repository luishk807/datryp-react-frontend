import React, { useState } from 'react';
import { connect } from 'react-redux';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import Layout from '../common/Layout/SubLayout';
import DestinationDetail from '../DestinationDetail';
import PropTypes from 'prop-types';
import _ from 'lodash';
import StepperComp from '../common/StepperComp';
import BasicInfo from '../DestinationDetail/BasicInfo';
import FriendPicker from '../DestinationDetail/FriendPicker';

const SingleTrip = ({
    tripInfo,
    onBasicInfo
}) => {
    console.log('tripInfo single', tripInfo);
    const handleBasicOnChange = (id, e) => {
        console.log("*****************************");
        console.log("handle onchange", id, ':',e);
        onBasicInfo("BASIC_INFO", { [id]: e.target.value});
    };

    const handleDestination = ({date, activity}) => {
        const destination = JSON.parse(JSON.stringify(tripInfo.destinations));
        let intinerary = _.get(destination, '0.itinerary') || [];
        let new_destination = _.get(destination, '0') || [];
        // let destination = [...tripInfo.destinations];

        if (destination.length) {
            new_destination = destination[0];
        }

        if (new_destination.intinerary) {
            intinerary = new_destination.intinerary;
        }

        if (intinerary.length) {
            const foundItem = intinerary.filter((item) => item.date === date);
            if (foundItem.length) {
                foundItem[0].activities.push(activity);
            } else {
                intinerary.push({
                    date,
                    activities: [activity]
                });    
            }
        } else {
            intinerary.push({
                date,
                activities: [activity]
            });    
        }
        new_destination.itinerary = intinerary;

        onBasicInfo && onBasicInfo("DESTINATION_SINGLE", destination);
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
            comp: <DestinationDetail onChange={handleDestination} type={tripInfo.type} startDate={tripInfo.startDate} endDate={tripInfo.endDate} destinations={tripInfo.destinations} />
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
    onBasicInfo: (type, value) => dispatch({ type: type, payload: value})
});


SingleTrip.propTypes = {
    tripInfo: PropTypes.object,
    onBasicInfo: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(SingleTrip);