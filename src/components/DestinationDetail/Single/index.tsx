import React from 'react';
import './index.css';
import Activities from 'components/DestinationDetail/Activities';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import type { Activity, ActionType, Friend } from 'types/trip.types';

interface SingleProps {
    trips?: Activity[] | null;
    participants?: Friend[];
    onChangePlace: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown) => void;
    isViewMode?: boolean;
}

const Single = ({
    trips = null,
    participants = [],
    onChangePlace,
    onChangeBudget,
    isViewMode = false,
}: SingleProps) => {
    return trips ? (
        <Activities
            isViewMode={isViewMode}
            onChangePlace={onChangePlace}
            activities={trips}
            onChangeBudget={onChangeBudget}
            participants={participants}
        />
    ) : (
        <AddPlaceBtn
            isViewMode={isViewMode}
            onChange={(e) => onChangePlace('add', e)}
        />
    );
};

export default Single;
