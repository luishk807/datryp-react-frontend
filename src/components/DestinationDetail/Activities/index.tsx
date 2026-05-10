import './index.css';
import moment from 'moment';
import { Grid } from '@mui/material';
import ImageBlock from 'components/DestinationDetail/ImageBlock';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import AddBudget from 'components/DestinationDetail/AddBudget';
import { convertMoney } from 'utils';
import DialogBox from 'components/common/FormFields/DialogBox';
import type { ActionType, Activity, ActivityStatus, Friend } from 'types/trip';

export interface ActivitiesProps {
    onChangePlace: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown) => void;
    activities?: Activity[] | null;
    participants?: Friend[];
    tripTypeId?: number;
    isViewMode?: boolean;
}

const getStatusName = (status: Activity['status']): string => {
    if (status && typeof status === 'object') {
        return (status as ActivityStatus).name ?? '';
    }
    return '';
};

const Activities = ({
    onChangePlace,
    onChangeBudget,
    activities = [],
    participants = [],
    tripTypeId,
    isViewMode = false,
}: ActivitiesProps) => {
    return (
        <>
            {activities &&
                activities.map((activity, indx) => {
                    const activityTime = `${moment(activity.startTime, 'HH:mm').format('LT').toString()} - ${moment(activity.endTime, 'HH:mm').format('LT').toString()}`;
                    const budgetList =
                        activity.budget && activity.budget.length
                            ? activity.budget
                                  .map((item) => `${item.user.label} (${convertMoney(item.budget)})`)
                                  .join(', ')
                            : '';
                    return (
                        <Grid
                            key={`activity-${indx}`}
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className="activity-content-trip border-trip"
                        >
                            <Grid container>
                                <Grid item lg={2} md={2} xs={12} className="content-image">
                                    <ImageBlock image={activity.image} />
                                </Grid>
                                <Grid item lg={10} md={10} xs={12} className="content-detail">
                                    <Grid container>
                                        <Grid item lg={11} md={11} xs={11} className="info">
                                            <span className="title">{activity.place}</span>
                                            <span className="status confirmed">
                                                {getStatusName(activity.status)}
                                            </span>
                                            <ul>
                                                <li>
                                                    <span className="location">{activity.location}</span>
                                                </li>
                                                <li>
                                                    <span className="label">Time:</span> {activityTime}
                                                </li>
                                                <li>
                                                    <span className="label">Who is paying:</span>
                                                    {` ${budgetList}`}
                                                    <AddBudget
                                                        isViewMode={isViewMode}
                                                        budget={activity.budget}
                                                        onSubmit={(e) =>
                                                            onChangeBudget('add', {
                                                                activityId: activity.id,
                                                                value: e,
                                                            })
                                                        }
                                                        participants={participants}
                                                    />
                                                </li>
                                                <li>
                                                    <span className="label">Cost:</span>{' '}
                                                    {convertMoney(activity.cost)}
                                                </li>
                                            </ul>
                                        </Grid>
                                        <Grid item lg={1} md={1} xs={1} className="option">
                                            <Grid container className="flex h-full">
                                                <Grid
                                                    item
                                                    lg={12}
                                                    md={12}
                                                    xs={12}
                                                    className="flex justify-end items-start font-medium"
                                                >
                                                    <AddPlaceBtn
                                                        isViewMode={isViewMode}
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
                                                        You are about to delete {activity.place}. Are you sure you want to delete this item
                                                    </DialogBox>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })}
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
        </>
    );
};

export default Activities;
