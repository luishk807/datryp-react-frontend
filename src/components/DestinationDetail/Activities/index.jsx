import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import ImageBlock from '../ImageBlock';
import AddPlaceBtn from '../../common/AddPlaceBtn';
import ButtonCustom from '../../common/FormFields/ButtonCustom';
import DialogBox from '../../common/FormFields/DialogBox';

const Activities = ({
    activities = [],
    onChange,
    onSavePlace,
    onDeletePlace,
})=> {
    const handleDelete = (e) => {
        console.log("delete", e);
        // ToDo: dialog confirmation
        // onDeletePlace && onDeletePlace(e);
    };

    const handleEdit = (e) => {
        console.log("edit", e);
        onSavePlace && onSavePlace(e);
    };

    return (
        <>

            {
                activities && activities.map((activity, indx) => (
                    <Grid key={`activity-${indx}`} item lg={12} md={12} className="content-trip border-trip">
                        <Grid container>
                            <Grid item lg={2} md={2} className="content-image">
                                <ImageBlock image={activity.image} />
                            </Grid>
                            <Grid item lg={10} md={10} className="content-detail">
                                <Grid container>
                                    <Grid item lg={11} md={11} className="info">
                                        <span className="title">{activity.place}</span>
                                        <span className="status confirmed">{activity?.status?.name}</span>
                                        <p>
                                            {activity.location}<br/>
                                          Time: {`${activity.startTime} - ${activity.endTime}`}<br/>
                                          Budget: {activity?.people?.length}[add]<br/>
                                          Cost: ${activity.cost}
                                        </p>
                                    </Grid>
                                    <Grid item lg={1} md={1} className="option">
                                        <Grid container className="flex h-full">
                                            <Grid item lg={12} md={12} className="flex justify-end items-start font-medium">
                                                <AddPlaceBtn type="edit" data={activity} buttonType="text" onChange={handleEdit}/>
                                            </Grid>
                                            <Grid item lg={12} md={12} className="flex justify-end items-end font-medium">
                                                <DialogBox 
                                                    title="Delete this place" 
                                                    buttonLabel="Delete"
                                                    buttonType="text" 
                                                    onConfirm={handleDelete}
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
                ))
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
    onSavePlace: PropTypes.func,
    onDeletePlace: PropTypes.func,
};

export default Activities;