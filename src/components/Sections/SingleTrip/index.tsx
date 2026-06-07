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
                    destinationIndx: activity.destinationIndx,
                })
            );
        }
    };

    // Thread `destinationIndx` through every activity action. A trip created
    // via /single can still be MULTIPLE-type (the user flipped the mode on
    // step 1), in which case the destination card passes the real leg index —
    // without forwarding it, every activity / budget / edit / delete fell back
    // to destination 0, so activities added to the 2nd+ leg landed on the 1st.
    // Mirrors MultipleTrip exactly.
    const handleChangePlace = ({ date, activity }: TripPlaceEvent) => {
        const { index, value, destinationIndx } = activity;
        switch (activity.type) {
            case 'add':
                dispatch(addPlace({ date, value, index, destinationIndx }));
                break;
            case 'edit':
                dispatch(
                    editPlace({
                        value: value.value,
                        itineraryIndex: index,
                        activityIndex: value.index,
                        destinationIndx,
                    })
                );
                break;
            case 'delete':
                dispatch(deletePlace({ value, index, destinationIndx }));
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
