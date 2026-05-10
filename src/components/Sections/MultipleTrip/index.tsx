import React, { useMemo } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
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
import type { ActionType, Friend } from 'types/trip';

interface ChangeEventLike {
    target: { value: unknown };
}

interface ActivityPayload {
    type: ActionType;
    value: any;
    index: number;
    destinationIndx?: number;
}

interface PlaceEvent {
    date: string;
    activity: ActivityPayload;
}

interface DestinationEvent {
    startDate: string;
    endDate: string;
    removeIndexes?: number[];
    activity: ActivityPayload;
}

const MultiTrip = () => {
    const tripInfo = useTripState();
    const dispatch = useTripDispatch();

    const handleBasicOnChange = (id: string, e: ChangeEventLike) => {
        dispatch(basicInfo({ [id]: e.target.value }));
    };

    const participants = useMemo<Friend[]>(() => {
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];

        const unique: Friend[] = [];
        merged.forEach((entry) => {
            if (!unique.find((u) => u.id === entry.id)) {
                unique.push(entry);
            }
        });
        return unique;
    }, [tripInfo]);

    const handleChangeBudget = ({ activity }: PlaceEvent) => {
        const { value, destinationIndx } = activity;
        if (activity.type === 'add') {
            dispatch(
                addBudget({
                    value: value?.value,
                    activityId: value?.activityId,
                    destinationIndx,
                })
            );
        }
    };

    const handleChangePlace = ({ date, activity }: PlaceEvent) => {
        const { index, value, destinationIndx } = activity;

        switch (activity.type) {
            case 'add':
                dispatch(addPlace({ date, value, index, destinationIndx }));
                break;
            case 'edit':
                dispatch(
                    editPlace({
                        value: value?.value,
                        itineraryIndex: index,
                        activityIndex: value?.index,
                        destinationIndx,
                    })
                );
                break;
            case 'delete':
                dispatch(deletePlace({ value, index, destinationIndx }));
                break;
        }
    };

    const handleChangeDestination = ({
        startDate,
        endDate,
        removeIndexes = [],
        activity,
    }: DestinationEvent) => {
        switch (activity.type) {
            case 'add':
                dispatch(
                    addDestination({
                        startDate,
                        endDate,
                        value: activity.value,
                        index: activity.index,
                    })
                );
                break;
            case 'edit':
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
            case 'delete':
                dispatch(deleteDestination({ index: activity.value }));
                break;
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
