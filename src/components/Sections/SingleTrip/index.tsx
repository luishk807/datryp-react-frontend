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

const SingleTrip = () => {
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
        if (activity.type === 'add') {
            dispatch(
                addBudget({
                    value: activity.value.value,
                    activityId: activity.value.activityId,
                })
            );
        }
    };

    const handleChangePlace = ({ date, activity }: PlaceEvent) => {
        switch (activity.type) {
            case 'add':
                dispatch(
                    addPlace({ date, value: activity.value, index: activity.index })
                );
                break;
            case 'edit':
                dispatch(
                    editPlace({
                        value: activity.value.value,
                        itineraryIndex: activity.index,
                        activityIndex: activity.value.index,
                    })
                );
                break;
            case 'delete':
                dispatch(
                    deletePlace({ value: activity.value, index: activity.index })
                );
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
                />
            ),
        },
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

export default SingleTrip;
