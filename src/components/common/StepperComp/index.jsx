import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import {Step, StepLabel, Typography, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import BasicTripInfo from 'components/BasicTripInfo';
import { connect } from 'react-redux';
import _ from 'lodash';
// import Confetti from 'components/Confetti';
import TripComplete from 'components/DestinationDetail/Completed';

const StepperComp = ({
    steps = null,
    data = null,
    tripInfo,
    resetTrip
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState(new Set());


    const isStepSkipped = (step) => (skipped.has(step));

    const isStepOptional = (step) => (step === 1);

    const handleNext = () => {
        let newSkipped = skipped;
        if(isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        } 

        const tripType = _.get(tripInfo, 'type');

        if (tripType) {
            const { name, steps } = tripType;
            if(activeStep === steps.FINISHED) {
                console.log(`send ${name} trip data to backend`, tripInfo);
                //resetTrip && resetTrip()
            }
        }


        console.log("active step", activeStep + 1);

        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped(newSkipped);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => (prevStep - 1));
    };

    const handleSkip = () => {
        // if(!isStepOptional(activeStep)) {
        //     throw new Error("you can't skip a step that isn't optional");
        // }

        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkipped((prevSkipped) => {
            const newSkipped = new Set(prevSkipped.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    const handleChangeStep = (step) => {
        setActiveStep(step);
    };

    const handleReset = () => setActiveStep(0);
    return (
        <div className="stepperMain">
            <Stepper activeStep={activeStep}>
                {

                    steps.map((step, index) => {
                        const stepProps = {};
                        const labelProps = {};

                        // if(isStepOptional(index)) {
                        //     labelProps.optional = (
                        //         <Typography variant="caption">Optional</Typography>
                        //     );
                        // }

                        if(isStepSkipped(index)) {
                            stepProps.completed = false;
                        }

                        return (
                            <Step classes={{
                            }} key={index} {...stepProps}>
                                <StepLabel StepIconComponent={StepIcon}
                                    {...labelProps}>{step.label}</StepLabel>
                            </Step>
                        );
                    })
                }
            </Stepper>
            {
                activeStep === steps.length ? (
                    <TripComplete onReset={handleReset} />
                ) : (
                    <Grid container>
                        {
                            activeStep >= 2 && (
                                <Grid item lg={12} md={12}>
                                    <BasicTripInfo data={data} onChangeStep={handleChangeStep} />
                                </Grid>
                            )
                        }

                        <Grid item lg={12} md={12} xs={12}>
                            <Typography sx={{ mt: 2, mb: 1}}>Step {activeStep + 1}</Typography>
                            {
                                steps[activeStep].comp
                            }
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
                                        <Button type="standard" onClick={handleNext} label={ activeStep === steps.length -1 ? "Finish": "Next"} />
                                    </div>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                )
            }
        </div>
    );
};

const mapStateToProps = (state) => ({ tripInfo: state });

const mapDispatchToProps = (dispatch) => {
    return {
        resetTrip: (value) => {
            dispatch({ type: 'RESET_STATE', payload: value});
        }
    };
};

StepperComp.propTypes = {
    steps: PropTypes.array,
    data: PropTypes.object,
    tripInfo: PropTypes.object,
    resetTrip: PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(StepperComp);