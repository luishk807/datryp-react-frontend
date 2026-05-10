import { useState, type ReactNode } from 'react';
import './index.css';
import { Step, StepLabel, Typography, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import BasicTripInfo from 'components/BasicTripInfo';
import TripComplete from 'components/DestinationDetail/Completed';
import { resetTrip, useTripDispatch } from 'context/TripContext';
import type { TripState } from 'types/trip';

export interface StepperStep {
    label: string;
    comp: ReactNode;
}

interface StepperCompProps {
    steps?: StepperStep[];
    data?: TripState;
}

const StepperComp = ({ steps = [], data }: StepperCompProps) => {
    const dispatch = useTripDispatch();
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());

    const isStepSkipped = (step: number) => skipped.has(step);

    const handleNext = () => {
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }
        setActiveStep((prev) => prev + 1);
        setSkipped(newSkipped);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleChangeStep = (step: number) => {
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
                    if (isStepSkipped(index)) stepProps.completed = false;
                    return (
                        <Step classes={{}} key={index} {...stepProps}>
                            <StepLabel StepIconComponent={StepIcon}>{step.label}</StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            {activeStep === steps.length ? (
                <TripComplete onReset={handleReset} />
            ) : (
                <Grid container>
                    {activeStep >= 2 && data && (
                        <Grid item lg={12} md={12}>
                            <BasicTripInfo data={data} onChangeStep={handleChangeStep} />
                        </Grid>
                    )}

                    <Grid item lg={12} md={12} xs={12}>
                        <Typography sx={{ mt: 2, mb: 1 }}>Step {activeStep + 1}</Typography>
                        {steps[activeStep]?.comp}
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

export default StepperComp;
