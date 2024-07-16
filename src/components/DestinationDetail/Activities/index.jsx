import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import moment from 'moment';
import { Grid } from '@mui/material';
import ImageBlock from 'components/DestinationDetail/ImageBlock';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import AddBudget from 'components/DestinationDetail/AddBudget';
import { convertMoney } from 'utils';
import DialogBox from 'components/common/FormFields/DialogBox';

const Activities = ({
    activities = [],
    onChange,
    onSavePlace,
    onDeletePlace,
    participants = [],
})=> {
    const handleDelete = (e) => {
        console.log("delete", e);
        onDeletePlace && onDeletePlace(e);
    };

    const handleEdit = (e) => {
        console.log("edit", e);
        onSavePlace && onSavePlace(e);
    };

    const handleBudgetSubmit = (activity, budget) => {
        const new_activities = JSON.parse(JSON.stringify(activity));
        console.log("handleBudgetSubmit activites", new_activities);
        console.log("handleBudgetSubmit budget", budget);
        new_activities.budget = budget;
        onChange({new_activities});
    };

    return (
        <>

            {
                activities && activities.map((activity, indx) => {
                    const activityTime = `${moment(activity.startTime, 'HH:mm').format('LT').toString()} - ${moment(activity.endTime, 'HH:mm').format('LT').toString()}`;
                    return (
                        <Grid key={`activity-${indx}`} item lg={12} md={12} xs={12} className="activity-content-trip border-trip">
                            <Grid container>
                                <Grid item lg={2} md={2} xs={12} className="content-image">
                                    <ImageBlock image={activity.image} />
                                </Grid>
                                <Grid item lg={10} md={10} xs={12} className="content-detail">
                                    <Grid container>
                                        <Grid item lg={11} md={11} xs={11} className="info">
                                            <span className="title">{activity.place}</span>
                                            <span className="status confirmed">{activity?.status?.name}</span>
                                            <ul>
                                                <li><span className="location">{activity.location}</span></li>
                                                <li><span className="label">Time:</span> {activityTime}</li>
                                                <li><span className="label">Who is paying:</span>{activity?.people?.length}
                                                    <AddBudget budget={activity.budget} onSubmit={(e) => handleBudgetSubmit(activity, e)} participants={participants}/>
                                                </li>
                                                <li><span className="label">Cost:</span> {convertMoney(activity.cost)}</li>
                                            </ul>

                                        </Grid>
                                        <Grid item lg={1} md={1} xs={1} className="option">
                                            <Grid container className="flex h-full">
                                                <Grid item lg={12} md={12} xs={12} className="flex justify-end items-start font-medium">
                                                    <AddPlaceBtn type="edit" data={activity} buttonType="text" onChange={handleEdit}/>
                                                </Grid>
                                                <Grid item lg={12} md={12} xs={12} className="flex justify-end items-end font-medium">
                                                    <DialogBox 
                                                        title="Delete this place" 
                                                        buttonLabel="Delete"
                                                        buttonType="text" 
                                                        onConfirm={() => handleDelete(activity)}
                                                    >
                                                    You are about to delete {activity.place}.  Are you sure you want to delete this item
                                                    </DialogBox>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })
            }
            <Grid item lg={12} className="content-trip">
                <Grid container>
                    <Grid item lg={12} className="add-place-item">
                        <AddPlaceBtn onChange={onChange} />
                    </Grid>
                </Grid>
            </Grid>
        </>

    );
};

Activities.propTypes = {
    onChange: PropTypes.func,
    activities: PropTypes.array,
    participants: PropTypes.array,
    onSavePlace: PropTypes.func,
    onDeletePlace: PropTypes.func,
};

export default Activities;