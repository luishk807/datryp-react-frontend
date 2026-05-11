import './index.css';
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

const MultiTrip = () => {
    const dispatch = useTripDispatch();

    const handleBasicOnChange = (id: string, e: TripChangeEvent) => {
        dispatch(basicInfo({ [id]: e.target.value }));
    };

    const handleChangeBudget = ({ activity }: TripPlaceEvent) => {
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

    const handleChangePlace = ({ date, activity }: TripPlaceEvent) => {
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
            title="Multrip Information"
            containerClassName="multriTrip"
            currentType="multiple"
            onBasicChange={handleBasicOnChange}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
            onChangeDestination={handleChangeDestination}
        />
    );
};

export default MultiTrip;
