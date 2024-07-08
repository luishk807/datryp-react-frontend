import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ButtonIcon from '../../ButtonIcon';
const Activities = ({
    activities = []
})=> {
    return (
        <>

            {
                activities && activities.map((activity, indx) => (
                    <Grid key={`activity-${indx}`} item lg={12} md={12} className="content-trip border-trip">
                        <Grid container>
                            <Grid item lg={2} md={2} className="content-image">
                                <img src={activity.image.url} />
                            </Grid>
                            <Grid item lg={10} md={10} className="content-detail">
                                <Grid container>
                                    <Grid item lg={11} md={11} className="info">
                                        <span className="title">{activity.name}</span>
                                        <span className="status confirmed">confirmed</span>
                                        <p>
                                            {activity.location}<br/>
                                          Time: {`${activity.startTime} - ${activity.endTime}`}<br/>
                                          People: {activity.people.length}<br/>
                                          Cost: ${activity.cost}
                                        </p>
                                    </Grid>
                                    <Grid item lg={1} md={1} className="option">
                                        <Grid container className="flex h-full">
                                            <Grid item lg={12} md={12} className="flex justify-end items-start font-medium"><a href="/">Edit</a></Grid>
                                            <Grid item lg={12} md={12} className="flex justify-end items-end font-medium"><a href="/">Delete</a></Grid>
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
                        <ButtonIcon title="Add Places" Icon={AddCircleIcon} />
                    </Grid>
                </Grid>
            </Grid>
        </>

    );
};

Activities.propTypes = {
    activities: PropTypes.array
};

export default Activities;