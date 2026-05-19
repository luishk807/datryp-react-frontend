import './index.scss';
import { useMemo } from 'react';
import classNames from 'classnames';
import { reformatDate } from 'utils';
import { Grid } from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ImageBlock from 'components/DestinationDetail/ImageBlock';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import AddBudget from 'components/DestinationDetail/AddBudget';
import DraggableActivity from 'components/DestinationDetail/Activities/DraggableActivity';
import IconConfirmButton from 'components/common/IconConfirmButton';
import { convertMoney } from 'utils';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_STATUS } from 'constants';
import type { ActionType, Activity, ActivityStatus, Friend } from 'types';

export interface ActivitiesProps {
    onChangePlace: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown) => void;
    activities?: Activity[] | null;
    participants?: Friend[];
    tripTypeId?: number;
    isViewMode?: boolean;
    /** Source destination index for any activity dragged out of this list.
     *  Defaults to 0 (single-trip case). */
    destIdx?: number;
    /** Date string identifying this day's drop target. Empty string means
     *  callers haven't wired drag-and-drop yet; the cards still render but
     *  without sortable/droppable behaviour. */
    date?: string;
    /** Country name for this day's destination — used to scope the
     *  AddPlace AI autocomplete so suggestions stay in-country. */
    country?: string;
    /** When true, the per-activity status pill (Planning/Confirmed toggle)
     *  is disabled. Used during new-trip creation so brand-new activities
     *  stay locked to Planning until the trip is actually saved. */
    lockActivityStatus?: boolean;
}

const isConfirmedStatus = (status: Activity['status']): boolean => {
    if (status && typeof status === 'object') {
        return (status as ActivityStatus).name === TRIP_STATUS.CONFIRMED;
    }
    return false;
};

const Activities = ({
    onChangePlace,
    onChangeBudget,
    activities = [],
    participants = [],
    tripTypeId,
    isViewMode = false,
    destIdx = 0,
    date = '',
    country = '',
    lockActivityStatus = false,
}: ActivitiesProps) => {
    // Day-level drop target — accepts drops onto empty space when there
    // are no sortable cards to land on. dnd-kit needs both the sortable
    // items AND a droppable container to support the empty-day case.
    const dndEnabled = Boolean(date) && !isViewMode;
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${destIdx}-${date}`,
        data: { type: 'day', destIdx, date },
        disabled: !dndEnabled,
    });

    const activityIds = useMemo(
        () => (activities ?? []).map((a) => `act-${a.id}`),
        [activities]
    );

    // Activities share the same `trip_statuses` lookup as trips, so toggling
    // the badge resolves the real backend UUID here. If the lookup hasn't
    // loaded yet (cold cache, transient network blip), we fall back to a
    // name-only object — `activityStatusIdOf` in tripMapper just drops the
    // non-UUID id on save, so this is a safe no-op fallback.
    const { data: tripStatuses = [] } = useTripStatuses();
    const { plannedStatus, confirmedStatus } = useMemo(() => {
        const byName = (n: string): ActivityStatus | undefined => {
            const row = tripStatuses.find((s) => s.name === n);
            return row ? { id: row.id, name: row.name } : undefined;
        };
        return {
            plannedStatus: byName(TRIP_STATUS.PLANNING) ?? { id: 0, name: TRIP_STATUS.PLANNING },
            confirmedStatus: byName(TRIP_STATUS.CONFIRMED) ?? { id: 0, name: TRIP_STATUS.CONFIRMED },
        };
    }, [tripStatuses]);

    const isEmpty = !activities || activities.length === 0;
    return (
        <div
            ref={setNodeRef}
            className={classNames('activities-droppable', {
                'is-drop-target': dndEnabled && isOver,
                'is-empty': isEmpty,
            })}
        >
            {dndEnabled && isEmpty && (
                <p className="activities-empty-hint">
                    Drop a place here, or add one below.
                </p>
            )}
            <SortableContext
                items={activityIds}
                strategy={verticalListSortingStrategy}
            >
            {activities &&
                activities.map((activity, indx) => {
                    const activityTime = `${reformatDate(activity.startTime, 'HH:mm', 'LT')} - ${reformatDate(activity.endTime, 'HH:mm', 'LT')}`;
                    const budgetEntries = activity.budget ?? [];
                    const hasBudget = budgetEntries.length > 0;
                    // Per-activity edit lock. True when the trip is in view-mode
                    // OR this specific place is already Confirmed — locking
                    // edit, delete-by-edit, and AddBudget all at once. The
                    // status pill stays clickable so the user can flip the
                    // place back to Planning to reopen editing.
                    const isPlaceLocked =
                        isViewMode || isConfirmedStatus(activity.status);
                    const hasImage = Boolean(activity.image?.url);
                    // Cost + budget are coupled: a non-money activity (just
                    // a note like "checkout at 10am") shouldn't show either
                    // row. We surface them only when there's an actual cost
                    // to split (>0). Existing budget without a cost is still
                    // respected so legacy rows don't disappear.
                    const numericCost = Number(activity.cost);
                    const hasCost =
                        Number.isFinite(numericCost) && numericCost !== 0;
                    const showBudgetRow = hasBudget || hasCost;
                    const card = (
                        <Grid
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className="activity-content-trip border-trip"
                        >
                            <IconConfirmButton
                                icon={<CloseRoundedIcon fontSize="small" />}
                                ariaLabel={`Delete ${activity.name}`}
                                title="Delete this activity"
                                onConfirm={() =>
                                    onChangePlace('delete', activity.id)
                                }
                                className="activity-card-close-btn"
                                isViewMode={isViewMode}
                            >
                                You are about to delete {activity.name}. Are
                                you sure?
                            </IconConfirmButton>
                            <Grid container>
                                {hasImage && (
                                    <Grid item lg={2} md={2} xs={12} className="content-image">
                                        <ImageBlock image={activity.image} />
                                    </Grid>
                                )}
                                <Grid
                                    item
                                    lg={hasImage ? 10 : 12}
                                    md={hasImage ? 10 : 12}
                                    xs={12}
                                    className="content-detail"
                                >
                                    <Grid container>
                                        <Grid item lg={12} md={12} xs={12} className="info">
                                            <div className="activity-title-row">
                                                <span className="title">{activity.name}</span>
                                                <AddPlaceBtn
                                                    isViewMode={isPlaceLocked}
                                                    type="edit"
                                                    data={activity}
                                                    countryScope={country}
                                                    triggerIcon={EditRoundedIcon}
                                                    triggerClassName="activity-edit-btn"
                                                    onChange={(e) =>
                                                        onChangePlace('edit', {
                                                            index: indx,
                                                            value: e,
                                                        })
                                                    }
                                                />
                                                {(() => {
                                                    const confirmed = isConfirmedStatus(activity.status);
                                                    const nextStatus = confirmed
                                                        ? plannedStatus
                                                        : confirmedStatus;
                                                    return (
                                                        <button
                                                            type="button"
                                                            className={
                                                                'status-toggle ' +
                                                                (confirmed ? 'is-confirmed' : 'is-pending')
                                                            }
                                                            disabled={isViewMode || lockActivityStatus}
                                                            aria-label={`Status: ${confirmed ? 'Confirmed' : 'Planning'}. Click to toggle.`}
                                                            onClick={() =>
                                                                onChangePlace('edit', {
                                                                    index: indx,
                                                                    value: {
                                                                        id: activity.id,
                                                                        status: nextStatus,
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            {confirmed ? 'Confirmed' : 'Planning'}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            <div className="activity-meta">
                                                {activity.location && (
                                                    <div className="meta-row">
                                                        <LocationOnOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text location">
                                                            {activity.location}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="meta-row">
                                                    <ScheduleOutlinedIcon className="meta-icon" />
                                                    <span className="meta-text">{activityTime}</span>
                                                </div>
                                                {hasCost && (
                                                    <div className="meta-row">
                                                        <PaymentsOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">
                                                            {convertMoney(activity.cost)}
                                                        </span>
                                                    </div>
                                                )}
                                                {showBudgetRow && (
                                                    <div
                                                        className={classNames(
                                                            'meta-row meta-row-budget',
                                                            { 'meta-row-budget-empty': !hasBudget }
                                                        )}
                                                    >
                                                        <GroupOutlinedIcon className="meta-icon" />
                                                        {hasBudget && (
                                                            <div className="budget-chips">
                                                                {budgetEntries.map((item) => (
                                                                    <span
                                                                        key={item.id}
                                                                        className="budget-chip"
                                                                    >
                                                                        <span className="budget-chip-name">
                                                                            {item.user.label}
                                                                        </span>
                                                                        <span className="budget-chip-amount">
                                                                            {convertMoney(item.budget)}
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <AddBudget
                                                            isViewMode={isPlaceLocked}
                                                            budget={activity.budget}
                                                            cost={activity.cost}
                                                            onSubmit={(e) =>
                                                                onChangeBudget('add', {
                                                                    activityId: activity.id,
                                                                    value: e,
                                                                })
                                                            }
                                                            participants={participants}
                                                        />
                                                    </div>
                                                )}
                                                {activity.note && (
                                                    <div className="meta-row meta-row-note">
                                                        <NotesOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">
                                                            {activity.note}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                    return (
                        <DraggableActivity
                            key={`activity-${activity.id}`}
                            activityId={activity.id}
                            destIdx={destIdx}
                            date={date}
                            disabled={!dndEnabled || isPlaceLocked}
                        >
                            {card}
                        </DraggableActivity>
                    );
                })}
            </SortableContext>
            <Grid item lg={12} className="content-trip">
                <Grid container>
                    <Grid item lg={12} className="add-place-item">
                        <AddPlaceBtn
                            isViewMode={isViewMode}
                            tripTypeId={tripTypeId}
                            countryScope={country}
                            onChange={(e) => onChangePlace('add', e)}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default Activities;
