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
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ImageBlock from 'components/DestinationDetail/ImageBlock';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import AddBudget from 'components/DestinationDetail/AddBudget';
import DraggableActivity from 'components/DestinationDetail/Activities/DraggableActivity';
import { convertMoney } from 'utils';
import DialogBox from 'components/common/FormFields/DialogBox';
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
                    const budgetList =
                        activity.budget && activity.budget.length
                            ? activity.budget
                                  .map((item) => `${item.user.label} (${convertMoney(item.budget)})`)
                                  .join(', ')
                            : '';
                    // Per-activity edit lock. True when the trip is in view-mode
                    // OR this specific place is already Confirmed — locking
                    // edit, delete-by-edit, and AddBudget all at once. The
                    // status pill stays clickable so the user can flip the
                    // place back to Planning to reopen editing.
                    const isPlaceLocked =
                        isViewMode || isConfirmedStatus(activity.status);
                    const hasImage = Boolean(activity.image?.url);
                    const card = (
                        <Grid
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className="activity-content-trip border-trip"
                        >
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
                                        <Grid item lg={11} md={11} xs={12} className="info">
                                            <span className="title">{activity.name}</span>
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
                                                        disabled={isViewMode}
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
                                                {(budgetList || !isPlaceLocked) && (
                                                    <div className="meta-row">
                                                        <GroupOutlinedIcon className="meta-icon" />
                                                        <span className="meta-text">
                                                            {budgetList || (
                                                                <span className="meta-hint">
                                                                    No one yet
                                                                </span>
                                                            )}
                                                        </span>
                                                        <AddBudget
                                                            isViewMode={isPlaceLocked}
                                                            budget={activity.budget}
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
                                                {Number.isFinite(Number(activity.cost)) &&
                                                    Number(activity.cost) !== 0 && (
                                                        <div className="meta-row">
                                                            <PaymentsOutlinedIcon className="meta-icon" />
                                                            <span className="meta-text">
                                                                {convertMoney(activity.cost)}
                                                            </span>
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
                                        <Grid item lg={1} md={1} xs={12} className="option">
                                            <Grid container className="flex h-full">
                                                <Grid
                                                    item
                                                    lg={12}
                                                    md={12}
                                                    xs={12}
                                                    className="flex justify-end items-start font-medium"
                                                >
                                                    <AddPlaceBtn
                                                        isViewMode={isPlaceLocked}
                                                        type="edit"
                                                        data={activity}
                                                        buttonType="text"
                                                        onChange={(e) =>
                                                            onChangePlace('edit', {
                                                                index: indx,
                                                                value: e,
                                                            })
                                                        }
                                                    />
                                                </Grid>
                                                <Grid
                                                    item
                                                    lg={12}
                                                    md={12}
                                                    xs={12}
                                                    className="flex justify-end items-end font-medium"
                                                >
                                                    <DialogBox
                                                        isViewMode={isViewMode}
                                                        title="Delete this place"
                                                        buttonLabel="Delete"
                                                        buttonType="text"
                                                        onConfirm={() =>
                                                            onChangePlace('delete', activity.id)
                                                        }
                                                    >
                                                        You are about to delete {activity.name}. Are you sure you want to delete this item
                                                    </DialogBox>
                                                </Grid>
                                            </Grid>
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
                            onChange={(e) => onChangePlace('add', e)}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default Activities;
