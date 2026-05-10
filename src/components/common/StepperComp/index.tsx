import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Step, StepLabel, Typography, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import BasicTripInfo from 'components/BasicTripInfo';
import _ from 'lodash';
import TripComplete from 'components/DestinationDetail/Completed';
import { resetTrip, useTripDispatch, useTripState } from 'context/TripContext';

const StepperComp = ({ steps = null, data = null }) => {
    const tripInfo = useTripState();
    const dispatch = useTripDispatch();
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState(new Set<number>());

    const isStepSkipped = (step) => skipped.has(step);

    const handleNext = () => {
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }

        const tripType = _.get(tripInfo, 'type');

        if (tripType) {
            const { name, steps: typeSteps } = tripType;
            if (activeStep === typeSteps.FINISHED) {
                console.log(`send ${name} trip data to backend`, tripInfo);
                // dispatch(resetTrip());
            }
        }

        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped(newSkipped);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleChangeStep = (step) => {
        setActiveStep(step);
    };

    const handleReset = () => {
        dispatch(resetTrip());
        setActiveStep(0);
    };

    return (
        <div className="stepperMain">
            <Stepper activeStep={activeStep}>
                {steps.map((step, index) => {
                    const stepProps: { completed?: boolean } = {};
                    const labelProps = {};

                    if (isStepSkipped(index)) {
                        stepProps.completed = false;
                    }

                    return (
                        <Step classes={{}} key={index} {...stepProps}>
                            <StepLabel StepIconComponent={StepIcon} {...labelProps}>
                                {step.label}
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            {activeStep === steps.length ? (
                <TripComplete onReset={handleReset} />
            ) : (
                <Grid container>
                    {activeStep >= 2 && (
                        <Grid item lg={12} md={12}>
                            <BasicTripInfo data={data} onChangeStep={handleChangeStep} />
                        </Grid>
                    )}

                    <Grid item lg={12} md={12} xs={12}>
                        <Typography sx={{ mt: 2, mb: 1 }}>Step {activeStep + 1}</Typography>
                        {steps[activeStep].comp}
                    </Grid>
                    <Grid item lg={12} md={12} xs={12}>
                        <Grid container className="mt-2.5">
                            <Grid item lg={6} md={6} xs={12} className="flex justify-start">
                                <div className="w-full lg:w-40 my-2.5">
                                    <Button type="standard" onClick={handleBack} label="Back" />
                                </div>
                            </Grid>
                            <Grid item lg={6} md={6} xs={12} className="flex justify-end">
                                <div className="w-full lg:w-40 my-2.5">
                                    <Button
                                        type="standard"
                                        onClick={handleNext}
                                        label={activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                                    />
                                </div>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </div>
    );
};

StepperComp.propTypes = {
    steps: PropTypes.array,
    data: PropTypes.object,
};

export default StepperComp;
