import React, { useMemo } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import _ from 'lodash';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import { REDUX_TYPE } from 'constants';
import {
    basicInfo,
    addPlace,
    editPlace,
    deletePlace,
    addBudget,
    addDestination,
    editDestination,
    deleteDestination,
    useTripDispatch,
    useTripState,
} from 'context/TripContext';

const MultiTrip = () => {
    const tripInfo = useTripState();
    const dispatch = useTripDispatch();

    const handleBasicOnChange = (id, e) => {
        dispatch(basicInfo({ [id]: e.target.value }));
    };

    const participants = useMemo(() => {
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];

        const unique = [];
        merged.forEach((entry) => {
            if (!unique.find((u) => u.id === entry.id)) {
                unique.push(entry);
            }
        });
        return unique;
    }, [tripInfo]);

    const handleChangeBudget = ({ date, activity }) => {
        const { index, value, destinationIndx } = activity;
        switch (activity.type) {
            case REDUX_TYPE.ADD: {
                dispatch(
                    addBudget({
                        value: value?.value,
                        itineraryId: index,
                        activityIndex: value?.index,
                        destinationIndx,
                    })
                );
                break;
            }
            case REDUX_TYPE.EDIT:
            case REDUX_TYPE.DELETE:
                console.log('budget edit/delete not implemented', date, activity);
                break;
        }
    };

    const handleChangePlace = ({ date, activity }) => {
        const { index, value, destinationIndx } = activity;

        switch (activity.type) {
            case REDUX_TYPE.ADD: {
                dispatch(
                    addPlace({
                        date,
                        value,
                        index,
                        destinationIndx,
                    })
                );
                break;
            }
            case REDUX_TYPE.EDIT: {
                dispatch(
                    editPlace({
                        value: value?.value,
                        itineraryIndex: index,
                        activityIndex: value?.index,
                        destinationIndx,
                    })
                );
                break;
            }
            case REDUX_TYPE.DELETE: {
                dispatch(
                    deletePlace({
                        value,
                        index,
                        destinationIndx,
                    })
                );
                break;
            }
        }
    };

    const handleChangeDestination = ({ startDate, endDate, removeIndexes, activity }) => {
        switch (activity.type) {
            case REDUX_TYPE.ADD: {
                dispatch(
                    addDestination({
                        startDate,
                        endDate,
                        value: activity.value,
                        index: activity.index,
                    })
                );
                break;
            }
            case REDUX_TYPE.EDIT: {
                dispatch(
                    editDestination({
                        startDate,
                        endDate,
                        removeIndexes,
                        value: activity.value,
                        index: activity.index,
                    })
                );
                break;
            }
            case REDUX_TYPE.DELETE: {
                dispatch(deleteDestination({ index: activity.value }));
                break;
            }
        }
    };

    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo data={tripInfo} onChange={handleBasicOnChange} />,
        },
        {
            label: 'Define the Trips',
            comp: (
                <FriendPicker
                    name="friends"
                    selectedOptions={tripInfo.friends}
                    onChange={handleBasicOnChange}
                />
            ),
        },
        {
            label: 'Finish',
            comp: (
                <DestinationDetail
                    type={tripInfo.type}
                    startDate={tripInfo.startDate}
                    participants={participants}
                    endDate={tripInfo.endDate}
                    destinations={tripInfo.destinations}
                    onChangePlace={handleChangePlace}
                    onChangeBudget={handleChangeBudget}
                    onChangeDestination={handleChangeDestination}
                />
            ),
        },
    ];

    return (
        <Layout title="Multrip Information">
            <Grid container className="multriTrip">
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp data={tripInfo} steps={steps} />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default MultiTrip;
