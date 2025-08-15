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

import { REDUX_TYPE } from 'constants';

const SingleTrip = ({
    tripInfo,
    onBasicInfo,
    deletePlace,
    editPlace,
    addPlace,
    addBudget,
    deleteBudget,
    editBudget,
    editActivity,
    deleteActivity,
    addActivity,
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

    const handleChangeBudget = ({date, activity}) => {
        console.log("handle budget");
        console.log("dat", date, " value:", activity);
        switch(activity.type) {
            case REDUX_TYPE.ADD: {
                console.log("add", date, " value: ", activity);
                addBudget({
                    date, value: 
                    activity.value.value, 
                    itineraryId: activity.index,
                    activityIndex: activity.value.index
                });
                break;
            }
            case REDUX_TYPE.EDIT: {
                console.log("edit", date, " value: ", activity);
                break;
            }
            case REDUX_TYPE.DELETE: {
                console.log("delete", date, " value: ", activity);
                break;
            }
        }
    };

    const handleChangePlace = ({date, activity}) => {
        console.log("handle place");
   
        switch(activity.type) {
            case REDUX_TYPE.ADD: {
                console.log("add", date, " value: ", activity);
                addPlace({date, value: activity.value, index: activity.index});
                break;
            }
            case REDUX_TYPE.EDIT: {
                console.log("edit", date, " value: ", activity);
                editPlace({
                    date, 
                    value: activity.value.value, 
                    itineraryIndex: activity.index, 
                    activityIndex: activity.value.index}
                );
                break;
            }
            case REDUX_TYPE.DELETE: {
                console.log("delete", date, " value: ", activity);
                deletePlace({date, value: activity.value, index: activity.index});
                break;
            }
        }
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
                type={tripInfo.type} 
                startDate={tripInfo.startDate} 
                participants={participants}
                endDate={tripInfo.endDate} 
                destinations={tripInfo.destinations} 
                onChangePlace={handleChangePlace}
                onChangeBudget={handleChangeBudget}
            />
        }
    ];

    return (
        <Layout title="Single Trip Detail">
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
    addPlace: (value) => dispatch({ type: 'ADD_PLACE', payload: value}),
    editPlace: (value) => dispatch({ type: 'EDIT_PLACE', payload: value}),
    deletePlace: (value) => dispatch({ type: 'DELETE_PLACE', payload: value}),
    addBudget: (value) => dispatch({ type: 'ADD_BUDGET', payload: value}),
    deleteBudget: (value) => dispatch({ type: 'DELETE_BUDGET', payload: value}),
    editBudget: (value) => dispatch({ type: 'EDIT_BUDGET', payload: value}),
    addActivity: (value) => dispatch({ type: 'ADD_ACTIVITY', payload: value}),
    editActivity: (value) => dispatch({ type: 'EDIT_ACTIVITY', payload: value}),
    deleteActivity: (value) => dispatch({ type: 'DELETE_ACTIVITY', payload: value})

});


SingleTrip.propTypes = {
    tripInfo: PropTypes.object,
    onBasicInfo: PropTypes.func,
    deletePlace: PropTypes.func,
    addPlace: PropTypes.func,
    editPlace: PropTypes.func,
    addBudget: PropTypes.func,
    deleteBudget: PropTypes.func,
    editBudget: PropTypes.func,
    addActivity: PropTypes.func,
    editActivity: PropTypes.func,
    deleteActivity: PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(SingleTrip);