import React from 'react';
import './index.scss';
import Activities from 'components/DestinationDetail/Activities';
import type { ActionType, Activity, Destination, Friend } from 'types';

interface SingleProps {
    trips?: Activity[] | null;
    /** Full destinations array — forwarded to Activities so its
     *  per-card directions origin reflects the live trip state. */
    destinations?: Destination[];
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
    /** Opt-in override for the status pill — forwarded unchanged. */
    allowStatusToggle?: boolean;
    /** Opt-in override for Mark-as-paid / edit-paid — forwarded. */
    allowPaidEdits?: boolean;
    /** Forwarded to Activities so post-planning UI can render. */
    tripStatusName?: string;
    /** Forwarded to Activities so the status pill disables itself
     *  while the parent's auto-save is in flight. */
    isAutoSaving?: boolean;
}

/** Single-destination day. Always renders Activities (even when empty) so
 *  the droppable container exists for drag-and-drop and the AddPlaceBtn
 *  stays inside the same wrapper. */
const Single = ({
    trips = null,
    destinations,
    participants = [],
    onChangePlace,
    onChangeBudget,
    isViewMode = false,
    date = '',
    country = '',
    lockActivityStatus = false,
    allowStatusToggle,
    allowPaidEdits,
    tripStatusName,
    isAutoSaving = false,
}: SingleProps) => (
    <Activities
        isViewMode={isViewMode}
        onChangePlace={onChangePlace}
        activities={trips ?? []}
        destinations={destinations}
        onChangeBudget={onChangeBudget}
        participants={participants}
        destIdx={0}
        date={date}
        country={country}
        lockActivityStatus={lockActivityStatus}
        allowStatusToggle={allowStatusToggle}
        allowPaidEdits={allowPaidEdits}
        tripStatusName={tripStatusName}
        isAutoSaving={isAutoSaving}
    />
);

export default Single;
