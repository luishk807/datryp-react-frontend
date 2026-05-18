import React from 'react';
import './index.scss';
import Activities from 'components/DestinationDetail/Activities';
import type { ActionType, Activity, Friend } from 'types';

interface SingleProps {
    trips?: Activity[] | null;
    participants?: Friend[];
    onChangePlace: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown) => void;
    isViewMode?: boolean;
    /** Calendar date this day represents — threaded into Activities so each
     *  card can be dragged out of (and dropped into) the right day. */
    date?: string;
    /** Country name for the (single) destination — scopes the AddPlace AI
     *  autocomplete so a Spain trip's suggestions stay in-country. */
    country?: string;
    /** Disable the per-activity status pill (new-trip flow only). */
    lockActivityStatus?: boolean;
}

/** Single-destination day. Always renders Activities (even when empty) so
 *  the droppable container exists for drag-and-drop and the AddPlaceBtn
 *  stays inside the same wrapper. */
const Single = ({
    trips = null,
    participants = [],
    onChangePlace,
    onChangeBudget,
    isViewMode = false,
    date = '',
    country = '',
    lockActivityStatus = false,
}: SingleProps) => (
    <Activities
        isViewMode={isViewMode}
        onChangePlace={onChangePlace}
        activities={trips ?? []}
        onChangeBudget={onChangeBudget}
        participants={participants}
        destIdx={0}
        date={date}
        country={country}
        lockActivityStatus={lockActivityStatus}
    />
);

export default Single;
