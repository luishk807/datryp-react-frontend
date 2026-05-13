import './index.scss';
import TripSteps from 'components/TripSteps';
import {
    basicInfo,
    addPlace,
    editPlace,
    deletePlace,
    addBudget,
    useTripDispatch,
} from 'context/TripContext';
import type {
    TripChangeEvent,
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

    return (
        <TripSteps
            title="Single Trip Detail"
            containerClassName="singleTrip"
            currentType="single"
            onBasicChange={handleBasicOnChange}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
        />
    );
};

export default SingleTrip;
