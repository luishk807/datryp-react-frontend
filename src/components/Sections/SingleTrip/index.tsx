import './index.scss';
import TripSteps from 'components/TripSteps';
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
} from 'context/TripContext';
import type {
    TripChangeEvent,
    TripDestinationEvent,
    TripPlaceEvent,
} from 'types';

const SingleTrip = () => {
    const dispatch = useTripDispatch();

    const handleBasicOnChange = (id: string, e: TripChangeEvent) => {
        dispatch(basicInfo({ [id]: e.target.value }));
    };

    const handleChangeBudget = ({ activity }: TripPlaceEvent) => {
        if (activity.type === 'add') {
            dispatch(
                addBudget({
                    value: activity.value.value,
                    activityId: activity.value.activityId,
                })
            );
        }
    };

    const handleChangePlace = ({ date, activity }: TripPlaceEvent) => {
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

    // A trip can be created via /single but still render the Multiple
    // destination display when its `type` is set to MULTIPLE (e.g. when a
    // city-link or a homepage entry seeded the trip with mode=multiple but
    // the user landed on /single first). Without these handlers the
    // destination card's Edit / Delete / Save calls would short-circuit on
    // `onChangeDestination?.(...)` and silently lose the user's edits.
    // Mirrors the MultipleTrip section so both routes behave identically.
    const handleChangeDestination = ({
        startDate,
        endDate,
        removeIndexes = [],
        activity,
    }: TripDestinationEvent) => {
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

    return (
        <TripSteps
            title="Single Trip Detail"
            containerClassName="singleTrip"
            currentType="single"
            onBasicChange={handleBasicOnChange}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
            onChangeDestination={handleChangeDestination}
        />
    );
};

export default SingleTrip;
