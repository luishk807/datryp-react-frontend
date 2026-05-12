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
import { useItineraryTypes } from 'api/hooks/useLookups';
import { useSaveItinerary } from 'api/hooks/useItineraries';
import { useUser } from 'context/UserContext';
import { resolveInteraryTypeId, tripStateToSaveInput } from 'utils/tripMapper';
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
    const { user } = useUser();
    const { data: itineraryTypes = [] } = useItineraryTypes();
    const saveItinerary = useSaveItinerary();

    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());
    const [saveError, setSaveError] = useState<string | null>(null);

    const isStepSkipped = (step: number) => skipped.has(step);
    const isLastStep = activeStep === steps.length - 1;

    const handleSaveAndAdvance = async () => {
        if (!data) {
            setActiveStep((prev) => prev + 1);
            return;
        }
        if (!user) {
            setSaveError('Please log in to save your trip.');
            return;
        }
        const interaryTypeId = resolveInteraryTypeId(data, itineraryTypes);
        if (!interaryTypeId) {
            setSaveError(
                'Could not resolve trip type. Lookup tables may not be seeded — try again in a moment.'
            );
            return;
        }
        const input = tripStateToSaveInput(data, { interaryTypeId });
        try {
            await saveItinerary.mutateAsync(input);
            setSaveError(null);
            setActiveStep((prev) => prev + 1);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to save trip.';
            setSaveError(message);
        }
    };

    const handleNext = () => {
        if (isLastStep) {
            void handleSaveAndAdvance();
            return;
        }
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }
        setActiveStep((prev) => prev + 1);
        setSkipped(newSkipped);
        setSaveError(null);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setSaveError(null);
    };

    const handleChangeStep = (step: number) => {
        setActiveStep(step);
    };

    const handleReset = () => {
        dispatch(resetTrip());
        setActiveStep(0);
        setSaveError(null);
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
                    {saveError && (
                        <Grid item lg={12} md={12} xs={12}>
                            <p
                                role="alert"
                                style={{
                                    color: '#b3261e',
                                    fontSize: '0.875rem',
                                    margin: '8px 0 0',
                                }}
                            >
                                {saveError}
                            </p>
                        </Grid>
                    )}
                    <Grid item lg={12} md={12} xs={12}>
                        <div className="step-actions">
                            {activeStep > 0 && (
                                <Button
                                    type="line"
                                    onClick={handleBack}
                                    label="Back"
                                />
                            )}
                            <Button
                                type="standard"
                                onClick={handleNext}
                                label={
                                    isLastStep
                                        ? saveItinerary.isPending
                                            ? 'Saving…'
                                            : 'Finish'
                                        : 'Next'
                                }
                                disabled={isLastStep && saveItinerary.isPending}
                            />
                        </div>
                    </Grid>
                </Grid>
            )}
        </div>
    );
};

export default StepperComp;
