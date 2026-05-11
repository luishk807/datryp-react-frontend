import { useState, type ReactNode } from 'react';
import './index.css';
import { Step, StepLabel, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import TripComplete from 'components/DestinationDetail/Completed';
import { resetTrip, useTripDispatch } from 'context/TripContext';
import type { TripState } from 'types';

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
                        <>
                            <Grid item lg={12} md={12} xs={12}>
                                <BasicTripInfo data={data} onChangeStep={handleChangeStep} />
                            </Grid>
                            <Grid item lg={12} md={12} xs={12}>
                                <BudgetSummary data={data} />
                            </Grid>
                        </>
                    )}

                    <Grid item lg={12} md={12} xs={12} className="step-title">
                        <h2 className="step-heading">
                            {steps[activeStep]?.label}
                        </h2>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12}>
                        {steps[activeStep]?.comp}
                    </Grid>
                    <Grid item lg={12} md={12} xs={12}>
                        <div className="step-actions">
                            {activeStep > 0 && (
                                <Button type="line" onClick={handleBack} label="Back" />
                            )}
                            <Button
                                type="standard"
                                onClick={handleNext}
                                label={activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                            />
                        </div>
                    </Grid>
                </Grid>
            )}
        </div>
    );
};

export default StepperComp;
