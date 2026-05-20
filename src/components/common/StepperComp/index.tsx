import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment'; // iteration loop in buildExpectedDates uses moment object mutation directly
import { formatDate, isValidDate } from 'utils';
import './index.scss';
import { Step, StepLabel, Grid } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import DialogBox from 'components/common/FormFields/DialogBox';
import ErrorAlert from 'components/common/ErrorAlert';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import TripStatusBadge from 'components/TripStatusBadge';
import TripComplete from 'components/DestinationDetail/Completed';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import PaywallModal from 'components/PaywallModal';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import { useItineraryTypes, useTripStatuses } from 'api/hooks/useLookups';
import { useDeleteItinerary, useSaveItinerary } from 'api/hooks/useItineraries';
import { isTripCapReachedError } from 'api/paywallError';
import { useUser } from 'context/UserContext';
import { resolveInteraryTypeId, tripStateToSaveInput } from 'utils/tripMapper';
import { TRIP_STATUS } from 'constants';
import type { TripState, TripStatus } from 'types';

interface DayCoverage {
    /** All dates in the trip's startDate→endDate range, ISO YYYY-MM-DD. */
    expected: string[];
    /** Subset of `expected` that has no activity yet. */
    missing: string[];
}

const toIsoDay = (value: string): string | null =>
    isValidDate(value) ? formatDate(value) : null;

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
        .map((d) => (isValidDate(d) ? formatDate(d, 'MMM D, YYYY') : d))
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
    const navigate = useNavigate();
    const { user } = useUser();
    const { data: itineraryTypes = [] } = useItineraryTypes();
    const { data: tripStatuses = [] } = useTripStatuses();
    const saveItinerary = useSaveItinerary();
    const deleteItinerary = useDeleteItinerary();

    const handleDeleteTrip = async () => {
        if (!data?.apiId) return;
        try {
            await deleteItinerary.mutateAsync(data.apiId);
            navigate('/trips');
        } catch (err) {
            setSaveError(
                err instanceof Error ? err.message : 'Failed to delete the trip.'
            );
        }
    };

    const handleCancelEdit = () => {
        if (data?.apiId) {
            navigate(`/trip-detail?id=${data.apiId}`);
        } else {
            navigate('/trips');
        }
    };

    // Editing an existing trip when apiId is present (set by apiToTripState
    // via the /single?id=<uuid> hydration in TripSteps). Drives a flat
    // single-page edit layout instead of the new-trip wizard.
    const isEditing = !!data?.apiId;

    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());
    const [saveError, setSaveError] = useState<string | null>(null);
    // Paywall modal state — captures the cap + current count from the
    // server's TRIP_CAP_REACHED extension so the modal can show "X / Y".
    const [paywallInfo, setPaywallInfo] = useState<{
        currentCount: number;
        cap: number;
    } | null>(null);
    const paywallModalRef = useRef<ModalButtonHandle>(null);

    // In edit mode the "Describe Your Trip!" form opens as a modal triggered
    // by the pencil-edit icon on BasicTripInfo, rather than appearing inline
    // (the summary card already shows that data — duplicating it inline read
    // poorly).
    const basicInfoModalRef = useRef<ModalButtonHandle>(null);

    const isStepSkipped = (step: number) => skipped.has(step);
    const isLastStep = activeStep === steps.length - 1;

    // Required-field check for the current step.
    // - Step 0 (basic info): name + dates.
    // - Step 1 (participants): at least one participant.
    // - Last step (or edit mode, which shows everything at once): all of the above.
    const stepMissing: string[] = [];
    if (data) {
        if (!isEditing && activeStep === 0) {
            if (!data.name?.trim()) stepMissing.push('trip name');
            if (!data.startDate) stepMissing.push('start date');
            if (!data.endDate) stepMissing.push('end date');
        }
        if (!isEditing && activeStep === 1) {
            if (!(data.friends ?? []).some((f) => f.userId)) {
                stepMissing.push('at least one participant');
            }
        }
        if (isEditing || isLastStep) {
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
                : TRIP_STATUS.PLANNING;
        const tripStatusId =
            tripStatuses.find((s) => s.name === desiredStatusName)?.id ?? null;

        const input = tripStateToSaveInput(data, {
            id: data.apiId,
            interaryTypeId,
            tripStatusId,
        });
        // Note: the creator is always implicitly the owner (`user_id`) and can
        // edit regardless of organizer status, so we respect their choice to
        // de-select themselves from the organizer list.
        try {
            await saveItinerary.mutateAsync(input);
            setSaveError(null);
            if (isEditing && data?.apiId) {
                // Edit flow: drop the user back at the read-only view of the
                // trip they just updated, rather than the new-trip "complete"
                // screen.
                navigate(`/trip-detail?id=${data.apiId}`);
                return;
            }
            setActiveStep((prev) => prev + 1);
        } catch (err) {
            if (isTripCapReachedError(err)) {
                // Free-tier paywall — route to the modal, suppress the
                // generic ErrorAlert (the modal carries the same info).
                setPaywallInfo({ currentCount: err.currentCount, cap: err.cap });
                paywallModalRef.current?.openModel();
                setSaveError(null);
                return;
            }
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

    // Edit mode: skip the wizard, render every section stacked with a single
    // Save Changes button. No Next/Back/Finish — Save Trip on TripDetail is
    // the equivalent action for budget-only edits; this page handles the
    // bigger structural edits (name, dates, friends, places).
    if (isEditing) {
        return (
            <div className="stepperMain stepperMain--edit">
                {saveItinerary.isPending ? (
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
                            Saving changes…
                        </span>
                    </div>
                ) : (
                    <Grid container>
                        {data && (
                            <>
                                {/* Standalone edit header — title + Save /
                                    Cancel / Delete Trip. Lives OUTSIDE
                                    BasicTripInfo so the basic-info card
                                    only carries the stats (with an inline
                                    Edit-basic-info button). Mirrors the
                                    /trip-detail header pattern. */}
                                <Grid item lg={12} md={12} xs={12}>
                                    <div className="edit-trip-header">
                                        <div className="edit-trip-header-title">
                                            <h2 className="edit-trip-name">
                                                {data.name || 'Untitled trip'}
                                            </h2>
                                            <TripStatusBadge
                                                data={data}
                                                onStatusChange={(status) =>
                                                    dispatch(basicInfo({ status }))
                                                }
                                                isSaving={saveItinerary.isPending}
                                            />
                                        </div>
                                        <div className="edit-trip-header-actions">
                                            <Button
                                                type="line"
                                                capitalizeType="uppercase"
                                                className="edit-trip-cancel-btn"
                                                label="Cancel"
                                                onClick={handleCancelEdit}
                                                disabled={saveItinerary.isPending}
                                            />
                                            <Button
                                                type="standard"
                                                capitalizeType="uppercase"
                                                className="edit-trip-save-btn"
                                                label={
                                                    saveItinerary.isPending
                                                        ? 'Saving…'
                                                        : 'Save Changes'
                                                }
                                                onClick={() =>
                                                    void handleSaveAndAdvance()
                                                }
                                                disabled={
                                                    saveItinerary.isPending ||
                                                    hasMissingFields
                                                }
                                            />
                                            <span className="edit-trip-delete-wrapper">
                                                <DialogBox
                                                    buttonLabel={
                                                        deleteItinerary.isPending
                                                            ? 'Deleting…'
                                                            : 'Delete Trip'
                                                    }
                                                    buttonType="line"
                                                    title="Delete this trip?"
                                                    onConfirm={handleDeleteTrip}
                                                >
                                                    This permanently removes
                                                    the trip and all its
                                                    activities. Participants
                                                    will no longer see it in
                                                    their list. This cannot
                                                    be undone.
                                                </DialogBox>
                                            </span>
                                        </div>
                                    </div>
                                    {(saveError ||
                                        (hasMissingFields && (
                                            <ErrorAlert>
                                                Add {stepMissing.join(', ')} to
                                                continue.
                                            </ErrorAlert>
                                        ))) && saveError ? (
                                        <ErrorAlert>{saveError}</ErrorAlert>
                                    ) : null}
                                    {!saveError && hasMissingFields && (
                                        <ErrorAlert>
                                            Add {stepMissing.join(', ')} to continue.
                                        </ErrorAlert>
                                    )}
                                </Grid>
                                <Grid item lg={12} md={12} xs={12}>
                                    <BasicTripInfo
                                        data={data}
                                        hideHeader
                                        onChangeStep={() =>
                                            basicInfoModalRef.current?.openModel()
                                        }
                                        onStatusChange={(status) =>
                                            dispatch(basicInfo({ status }))
                                        }
                                        onEditBasicInfo={() =>
                                            basicInfoModalRef.current?.openModel()
                                        }
                                        isSaving={saveItinerary.isPending}
                                    />
                                </Grid>
                                <Grid item lg={12} md={12} xs={12}>
                                    <BudgetSummary data={data} />
                                </Grid>
                            </>
                        )}
                        {/* Skip steps 0 (BasicInfo) and 1 (Participants) —
                            they live inside the trip-info modal triggered by
                            the BasicTripInfo edit pencil. Only the activities
                            section (steps[2], the "Finish" step from the
                            new-trip flow) stays inline because it's the bulky
                            part the user actually scrolls through. The step
                            label ("Finish") isn't rendered in edit mode —
                            once you're editing an existing trip, calling the
                            activities section "Finish" makes no sense and
                            the date blocks already title themselves. */}
                        {steps.slice(2).map((step, idx) => (
                            <Grid
                                item
                                lg={12}
                                md={12}
                                xs={12}
                                key={`edit-step-${idx + 2}`}
                            >
                                {step.comp}
                            </Grid>
                        ))}
                        <ModalButton ref={basicInfoModalRef} title="Edit trip info">
                            {steps[0] && (
                                <div className="edit-trip-modal-section">
                                    <h3 className="edit-trip-modal-heading">
                                        {steps[0].label}
                                    </h3>
                                    {steps[0].comp}
                                </div>
                            )}
                            {steps[1] && (
                                <div className="edit-trip-modal-section">
                                    <h3 className="edit-trip-modal-heading">
                                        {steps[1].label}
                                    </h3>
                                    {steps[1].comp}
                                </div>
                            )}
                            <div className="edit-trip-modal-actions">
                                <Button
                                    type="standard"
                                    capitalizeType="uppercase"
                                    label="Done"
                                    onClick={() =>
                                        basicInfoModalRef.current?.closeModal()
                                    }
                                />
                            </div>
                        </ModalButton>
                        {/* Cancel + Save Trip both live in the BasicTripInfo
                            header so users don't have to scroll to find them.
                            saveError + missing-fields alert surface via
                            BasicTripInfo's saveError prop. */}
                    </Grid>
                )}
                {paywallInfo && (
                    <PaywallModal
                        ref={paywallModalRef}
                        currentCount={paywallInfo.currentCount}
                        cap={paywallInfo.cap}
                        onDismiss={() => setPaywallInfo(null)}
                    />
                )}
            </div>
        );
    }

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
                                    // Lock the status badge while creating a
                                    // brand-new trip — until the trip is saved
                                    // and gets an apiId, it stays on Planning.
                                    // The trip-name pencil + status modal both
                                    // gate on isViewMode so this disables both.
                                    isViewMode={!data.apiId}
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
                            <ErrorAlert>
                                Add {stepMissing.join(', ')} to continue.
                            </ErrorAlert>
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
            {paywallInfo && (
                <PaywallModal
                    ref={paywallModalRef}
                    currentCount={paywallInfo.currentCount}
                    cap={paywallInfo.cap}
                    onDismiss={() => setPaywallInfo(null)}
                />
            )}
        </div>
    );
};

export default StepperComp;
