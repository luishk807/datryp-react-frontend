import { useState, type ReactNode } from 'react';
import moment from 'moment';
import './index.scss';
import { Step, StepLabel, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import TripComplete from 'components/DestinationDetail/Completed';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import { useItineraryTypes, useTripStatuses } from 'api/hooks/useLookups';
import { useSaveItinerary } from 'api/hooks/useItineraries';
import { useUser } from 'context/UserContext';
import { resolveInteraryTypeId, tripStateToSaveInput } from 'utils/tripMapper';
import type { TripState, TripStatus } from 'types';

interface DayCoverage {
    /** All dates in the trip's startDate→endDate range, ISO YYYY-MM-DD. */
    expected: string[];
    /** Subset of `expected` that has no activity yet. */
    missing: string[];
}

const toIsoDay = (value: string): string | null => {
    const m = moment(value);
    return m.isValid() ? m.format('YYYY-MM-DD') : null;
};

/** Every date between start and end, inclusive. Empty if either is missing. */
const buildExpectedDates = (state: TripState | undefined): string[] => {
    if (!state?.startDate || !state.endDate) return [];
    const start = moment(state.startDate);
    const end = moment(state.endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) {
        return [];
    }
    const dates: string[] = [];
    const cur = start.clone().startOf('day');
    const last = end.clone().startOf('day');
    while (cur.isSameOrBefore(last, 'day')) {
        dates.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'day');
    }
    return dates;
};

const inspectDays = (state: TripState | undefined): DayCoverage => {
    const expected = buildExpectedDates(state);
    const filled = new Set<string>();
    for (const dest of state?.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            if ((day.activities ?? []).length > 0) {
                const iso = toIsoDay(day.date);
                if (iso) filled.add(iso);
            }
        }
    }
    return {
        expected,
        missing: expected.filter((d) => !filled.has(d)),
    };
};

const formatDateList = (isoDates: string[]): string => {
    if (!isoDates.length) return '';
    return isoDates
        .map((d) => {
            const m = moment(d);
            return m.isValid() ? m.format('MMM D, YYYY') : d;
        })
        .join(', ');
};

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
    const { data: tripStatuses = [] } = useTripStatuses();
    const saveItinerary = useSaveItinerary();

    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());
    const [saveError, setSaveError] = useState<string | null>(null);

    const isStepSkipped = (step: number) => skipped.has(step);
    const isLastStep = activeStep === steps.length - 1;

    // Required-field check for the current step.
    // - Step 0 (basic info): name + dates.
    // - Step 1 (participants): at least one participant.
    // - Last step: everything above + at least one organizer.
    const stepMissing: string[] = [];
    if (data) {
        if (activeStep === 0) {
            if (!data.name?.trim()) stepMissing.push('trip name');
            if (!data.startDate) stepMissing.push('start date');
            if (!data.endDate) stepMissing.push('end date');
        }
        if (activeStep === 1) {
            if (!(data.friends ?? []).some((f) => f.userId)) {
                stepMissing.push('at least one participant');
            }
        }
        if (isLastStep) {
            if (!data.name?.trim()) stepMissing.push('trip name');
            if (!data.startDate) stepMissing.push('start date');
            if (!data.endDate) stepMissing.push('end date');
            if (!(data.friends ?? []).some((f) => f.userId)) {
                stepMissing.push('at least one participant');
            }
            if (!(data.organizer ?? []).some((o) => o.userId)) {
                stepMissing.push('at least one organizer');
            }
            const { expected, missing: emptyDates } = inspectDays(data);
            if (expected.length === 0) {
                // No dates yet — earlier checks for start/end date already catch this.
                stepMissing.push('at least one place');
            } else if (emptyDates.length > 0) {
                stepMissing.push(
                    `a place for ${formatDateList(emptyDates)}`
                );
            }
        }
    }
    const hasMissingFields = stepMissing.length > 0;

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

        const missing: string[] = [];
        if (!data.name?.trim()) missing.push('trip name');
        if (!data.startDate) missing.push('start date');
        if (!data.endDate) missing.push('end date');
        if (!(data.friends ?? []).some((f) => f.userId)) {
            missing.push('at least one participant');
        }
        if (!(data.organizer ?? []).some((o) => o.userId)) {
            missing.push('at least one organizer');
        }
        const { expected, missing: emptyDates } = inspectDays(data);
        if (expected.length === 0) {
            missing.push('at least one place');
        } else if (emptyDates.length > 0) {
            missing.push(`a place for ${formatDateList(emptyDates)}`);
        }
        if (missing.length) {
            setSaveError(
                `Please provide ${missing.join(', ')} before saving.`
            );
            return;
        }

        // Resolve the trip-status name (frontend uses the sample list) to the
        // real backend UUID via the seeded trip_statuses lookup. Defaults to
        // "Planning" if the user hasn't picked anything.
        const currentStatus = data.status;
        const desiredStatusName =
            currentStatus && typeof currentStatus === 'object'
                ? (currentStatus as TripStatus).name
                : 'Planning';
        const tripStatusId =
            tripStatuses.find((s) => s.name === desiredStatusName)?.id ?? null;

        const input = tripStateToSaveInput(data, {
            interaryTypeId,
            tripStatusId,
        });
        // Note: the creator is always implicitly the owner (`user_id`) and can
        // edit regardless of organizer status, so we respect their choice to
        // de-select themselves from the organizer list.
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
            ) : saveItinerary.isPending ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        padding: '64px 24px',
                        minHeight: '320px',
                        color: 'rgba(0, 0, 0, 0.7)',
                    }}
                    role="status"
                    aria-live="polite"
                >
                    <span
                        style={{
                            width: '36px',
                            height: '36px',
                            border: '3px solid rgba(0, 0, 0, 0.1)',
                            borderTopColor: '#1976d2',
                            borderRadius: '50%',
                            animation: 'searchbar-spin 0.9s linear infinite',
                        }}
                        aria-hidden="true"
                    />
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                        Saving your trip…
                    </span>
                </div>
            ) : (
                <Grid container>
                    {activeStep >= 2 && data && (
                        <>
                            <Grid item lg={12} md={12} xs={12}>
                                <BasicTripInfo
                                    data={data}
                                    onChangeStep={handleChangeStep}
                                    onStatusChange={(status) =>
                                        dispatch(basicInfo({ status }))
                                    }
                                />
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
                    {!saveError && hasMissingFields && (
                        <Grid item lg={12} md={12} xs={12}>
                            <p
                                style={{
                                    color: '#b3261e',
                                    background: '#fdecea',
                                    border: '1px solid #f5c2bd',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    margin: '12px 0 0',
                                }}
                            >
                                Add {stepMissing.join(', ')} to continue.
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
                                disabled={
                                    hasMissingFields ||
                                    (isLastStep && saveItinerary.isPending)
                                }
                            />
                        </div>
                    </Grid>
                </Grid>
            )}
        </div>
    );
};

export default StepperComp;
