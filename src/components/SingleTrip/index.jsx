import React, { useMemo } from 'react';
import { connect } from 'react-redux';
import './index.css';
import { 
    Grid,
} from '@mui/material';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';

import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import FriendPicker from 'components/DestinationDetail/FriendPicker';

const SingleTrip = ({
    tripInfo,
    onBasicInfo,
    onSingleInfo,
    onSavePlace,
    onDeletePlace,
    onSaveActivity
}) => {
    console.log('tripInfo single', tripInfo);
    const handleBasicOnChange = (id, e) => {
        console.log("*****************************");
        console.log("handle onchange", id, ':',e);
        onBasicInfo({[id]: e.target.value});
    };

    const participants = useMemo(() => {
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];
    
        const unique = [];
        Object.keys(merged).forEach(key => {
            if (!unique.length) {
                unique.push(merged[key]);
            } else {
                const found = unique.filter(item => item.id === merged[key].id);
                if (!found.length) {
                    unique.push(merged[key]);
                }
            }
        });
        return unique;
    }, [tripInfo]);

    const handleBudget = (data) => {
        onSaveActivity(data);
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
                // foundItem[0].activities.push(activity);
                const { id, type, value} = activity;
                if (type && type === 'budget') {
                    console.log('budget', activity);
                    handleBudget({id, value});
                } else {
                    foundItem[0].activities.push(activity);
                }

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

        console.log("destination", destination);
        onSingleInfo && onSingleInfo(destination);
    };

    const handlePlaceSave = (e) => {
        console.log("edit", e);
        onSavePlace && onSavePlace(e);
    };

    const handlePlaceDelete = (e) => {
        console.log("edit", e);
        onDeletePlace && onDeletePlace(e);
    };

    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo 
                data={tripInfo}
                onChange={handleBasicOnChange} 
            />
        }, {
            label: 'Define the Trips',
            comp: <FriendPicker 
                name="friends"
                selectedOptions={tripInfo.friends} 
                onChange={handleBasicOnChange}
            />
        }, {
            label: 'Finish',
            comp: <DestinationDetail 
                onChange={handleDestination} 
                type={tripInfo.type} 
                startDate={tripInfo.startDate} 
                participants={participants}
                endDate={tripInfo.endDate} 
                destinations={tripInfo.destinations} 
                onSavePlace={handlePlaceSave} 
                onDeletePlace={handlePlaceDelete} 
            />
        }
    ];

    return (
        <Layout>
            <Grid container className="singleTrip">
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp data={tripInfo} steps={steps} />
                </Grid>
            </Grid>
        </Layout>
    );
};


const mapStateToProps = (state) => ({
    tripInfo: state
});

const mapDispatchToProps = (dispatch) => ({
    onBasicInfo: (value) => dispatch({ type: 'BASIC_INFO', payload: value}),
    onSingleInfo: (value) => dispatch({ type: 'DESTINATION_SINGLE', payload: value}),
    onSavePlace: (value) => dispatch({ type: 'ON_SAVE_PLACE', payload: value}),
    onDeletePlace: (value) => dispatch({ type: 'ON_DELETE_PLACE', payload: value}),
    onSaveActivity: (value) => dispatch({ type: 'ACTIVITY_SINGLE', payload: value})
});


SingleTrip.propTypes = {
    tripInfo: PropTypes.object,
    onBasicInfo: PropTypes.func,
    onSingleInfo: PropTypes.func,
    onSavePlace: PropTypes.func,
    onDeletePlace: PropTypes.func,
    onSaveActivity: PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(SingleTrip);