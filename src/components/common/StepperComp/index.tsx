import {
    createContext,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment'; // iteration loop in buildExpectedDates uses moment object mutation directly
import { formatDate, isValidDate } from 'utils';
import './index.scss';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Step,
    StepLabel,
    Grid,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Stepper from '@mui/material/Stepper';
import StepIcon from './StepIcon';
import Button from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import Menu, { MenuActionItem } from 'components/common/Menu';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import TripStatusBadge from 'components/TripStatusBadge';
import NotifyParticipantsCheckbox from 'components/NotifyParticipantsCheckbox';
import TripComplete from 'components/DestinationDetail/Completed';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import PaywallModal from 'components/PaywallModal';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import { useItineraryTypes, useTripStatuses } from 'api/hooks/useLookups';
import { useDeleteItinerary, useSaveItinerary } from 'api/hooks/useItineraries';
import { isTripCapReachedError } from 'api/paywallError';
import { useUser } from 'context/UserContext';
import { resolveInteraryTypeId, tripStateToSaveInput } from 'utils/tripMapper';
import { TRIP_BASIC, TRIP_STATUS } from 'constants';
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

interface StepperAdvanceContextValue {
    onAdvance: () => void;
}

const StepperAdvanceContext = createContext<StepperAdvanceContextValue>({
    onAdvance: () => {},
});

/** Step components that want to fire the wizard's "Next" imperatively
 *  (e.g. the mode picker auto-advances on click) read this hook. Outside
 *  of StepperComp the default is a no-op, so the hook is safe to call
 *  unconditionally. */
export const useStepperAdvance = (): StepperAdvanceContextValue =>
    useContext(StepperAdvanceContext);

interface StepperCompProps {
    steps?: StepperStep[];
    data?: TripState;
    /** Optional callback fired whenever the active wizard step changes.
     *  Lets the parent (TripSteps) keep its own copy of the active step
     *  so it can show the right tour-tooltips for the current section. */
    onActiveStepChange?: (step: number) => void;
}

const StepperComp = ({
    steps = [],
    data,
    onActiveStepChange,
}: StepperCompProps) => {
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const { user } = useUser();
    const { data: itineraryTypes = [] } = useItineraryTypes();
    const { data: tripStatuses = [] } = useTripStatuses();
    const saveItinerary = useSaveItinerary();
    const deleteItinerary = useDeleteItinerary();

    // Edit-mode kebab menu state (Cancel trip / Delete trip).
    const [editMenuAnchor, setEditMenuAnchor] = useState<HTMLElement | null>(
        null
    );
    const [editConfirm, setEditConfirm] = useState<null | 'cancel' | 'delete'>(
        null
    );

    const handleDeleteTrip = async () => {
        if (!data?.apiId) return;
        try {
            await deleteItinerary.mutateAsync({
                id: data.apiId,
                notifyParticipants,
            });
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

    // Mark the trip as Cancelled from edit mode — saves the current
    // form state with status=Cancelled and routes back to the trip view.
    const handleCancelTripFromEdit = async () => {
        if (!data?.apiId) return;
        const interaryTypeId = resolveInteraryTypeId(data, itineraryTypes);
        if (!interaryTypeId) {
            setSaveError(
                'Could not resolve trip type. Try again in a moment.'
            );
            return;
        }
        const cancelledRow = tripStatuses.find(
            (s) => s.name === TRIP_STATUS.CANCELLED
        );
        if (!cancelledRow) {
            setSaveError(
                "Couldn't resolve the Cancelled status. Try again shortly."
            );
            return;
        }
        try {
            const input = tripStateToSaveInput(data, {
                id: data.apiId,
                interaryTypeId,
                tripStatusId: cancelledRow.id,
                notifyParticipants,
                activityStatusLookup: new Map(
                    tripStatuses.map((s) => [s.name, s.id])
                ),
            });
            await saveItinerary.mutateAsync(input);
            navigate(`/trip-detail?id=${data.apiId}`);
        } catch (err) {
            setSaveError(
                err instanceof Error ? err.message : 'Failed to cancel the trip.'
            );
        }
    };

    const handleEditConfirm = async () => {
        if (editConfirm === 'cancel') {
            await handleCancelTripFromEdit();
        } else if (editConfirm === 'delete') {
            await handleDeleteTrip();
        }
        setEditConfirm(null);
    };

    // Editing an existing trip when apiId is present (set by apiToTripState
    // via the /single?id=<uuid> hydration in TripSteps). Drives a flat
    // single-page edit layout instead of the new-trip wizard.
    const isEditing = !!data?.apiId;

    const [activeStep, setActiveStepRaw] = useState(0);
    // Wrap setActiveStep so any caller fires the parent callback too.
    // Keeps TripSteps' tour-aware copy of the active step in lockstep
    // with the stepper's internal state.
    const setActiveStep = (next: number | ((prev: number) => number)) => {
        setActiveStepRaw((prev) => {
            const resolved = typeof next === 'function' ? next(prev) : next;
            onActiveStepChange?.(resolved);
            return resolved;
        });
    };
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());
    const [saveError, setSaveError] = useState<string | null>(null);
    // Per-save opt-out for participant notifications. Defaults ON;
    // displayed only when there's actually someone else to notify.
    const [notifyParticipants, setNotifyParticipants] = useState(true);
    const otherMemberCount = useMemo(() => {
        const friends = data?.friends ?? [];
        const organizers = data?.organizer ?? [];
        const ids = new Set<string | number>();
        for (const f of [...friends, ...organizers]) {
            if (f.userId) ids.add(f.userId);
        }
        return ids.size;
    }, [data?.friends, data?.organizer]);
    // Subtract one for the actor; if anyone remains the toggle is useful.
    // The 'finish' / save path always uses the actor's identity so they
    // never count as a recipient.
    const showNotifyToggle = otherMemberCount > 1;
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

    // Required-field check for the current step. Matched by step *label*
    // because the merged create flow conditionally renders the destination
    // picker inside the Basics step (single-trip-only, when no country was
    // preset). Labels mirror the entries in `TripSteps`.
    const activeLabel = steps[activeStep]?.label;
    const stepMissing: string[] = [];
    if (data) {
        if (!isEditing && activeLabel === 'Trip basics') {
            if (!data.type?.id) stepMissing.push('a trip type');
            // Destination is required only for single-trip + no preset
            // country. Multi-trips pick countries per-day in the Itinerary
            // step, so the picker is hidden there. Mirrors the
            // `needsDestinationStep` rule in TripSteps.
            const isSingleMode = data.type?.id === TRIP_BASIC.SINGLE.id;
            const countryAlreadyPicked = Boolean(
                data.destinations?.[0]?.country?.id ||
                    data.destinations?.[0]?.country?.name
            );
            if (isSingleMode && !countryAlreadyPicked) {
                stepMissing.push('a destination country');
            }
            if (!data.startDate) stepMissing.push('start date');
            if (!data.endDate) stepMissing.push('end date');
            // Budget is required (≥ 0). We treat 0 as "flexible" — the
            // user signals they don't want to track spend — and accept
            // it. An empty / non-numeric budget blocks advance.
            const budgetVal = data.budget;
            const budgetNumeric =
                typeof budgetVal === 'number'
                    ? budgetVal
                    : Number(budgetVal);
            if (
                budgetVal === undefined ||
                budgetVal === null ||
                String(budgetVal).trim() === '' ||
                !Number.isFinite(budgetNumeric)
            ) {
                stepMissing.push('a budget (use 0 if flexible)');
            }
        }
        if (!isEditing && activeLabel === 'People') {
            if (!(data.organizer ?? []).some((o) => o.userId)) {
                stepMissing.push('at least one organizer');
            }
            // Participants are required — the current user is auto-seeded
            // into `friends` on mount (see TripSteps), so an empty list
            // means the user actively deselected everyone. Block advance
            // until at least one participant is back.
            if (!(data.friends ?? []).length) {
                stepMissing.push('at least one participant');
            }
        }
        if (isEditing || isLastStep) {
            if (!data.name?.trim()) stepMissing.push('trip name');
            if (!data.startDate) stepMissing.push('start date');
            if (!data.endDate) stepMissing.push('end date');
            if (!(data.organizer ?? []).some((o) => o.userId)) {
                stepMissing.push('at least one organizer');
            }
            if (!(data.friends ?? []).length) {
                stepMissing.push('at least one participant');
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
        if (!(data.organizer ?? []).some((o) => o.userId)) {
            missing.push('at least one organizer');
        }
        // Participants are required — current user is auto-seeded into
        // `friends`, so an empty list means the user deselected everyone.
        if (!(data.friends ?? []).length) {
            missing.push('at least one participant');
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
            notifyParticipants,
            // Resolve activity statuses by NAME when the toggled
            // pill captured the placeholder `{ id: 0, name: ... }`
            // before useTripStatuses resolved. Without this, every
            // toggle made on cold cache saves as `null` and the
            // post-save refetch reverts the badge to Planning —
            // looking like the save lost the change.
            activityStatusLookup: new Map(
                tripStatuses.map((s) => [s.name, s.id])
            ),
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

    // `useStepperAdvance` lets a step component fire the wizard's "Next"
    // imperatively (e.g. TripModeStep auto-advances when the user picks a
    // card so they don't have to hit Next). The provider wraps the step
    // body below.
    const stepperAdvanceValue = useMemo(
        () => ({ onAdvance: handleNext }),
        // handleNext is stable enough — it closes over state but is
        // recreated each render, and we re-run the memo each render anyway.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [activeStep, isLastStep]
    );

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setSaveError(null);
    };

    const handleChangeStep = (step: number) => {
        setActiveStep(step);
    };

    const handleReset = () => {
        // Plan-another should land on the home page so the user can either
        // search a country or use AI — those ARE the "where are you going?"
        // entry points. Resetting in-place dropped them on the Trip-type
        // step which assumes we already know the destination.
        dispatch(resetTrip());
        setSaveError(null);
        navigate('/');
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
                                            {/* Bell sits BETWEEN title and the
                                                status/action so the broadcast
                                                affordance is visually anchored
                                                to the trip name rather than
                                                grouped with the status CTA. */}
                                            {showNotifyToggle && (
                                                <NotifyParticipantsCheckbox
                                                    checked={notifyParticipants}
                                                    onChange={setNotifyParticipants}
                                                    disabled={
                                                        saveItinerary.isPending ||
                                                        deleteItinerary.isPending
                                                    }
                                                />
                                            )}
                                            {/* In edit mode the title-row pill
                                                IS the promote-status action
                                                ("Confirm trip" in Planning,
                                                "Mark complete" in Confirmed) —
                                                tapping it advances the trip's
                                                lifecycle, replacing the
                                                read-only status indicator used
                                                on the non-editing TripDetail
                                                page. The user is already in
                                                edit mode here, so a
                                                clickable affordance is more
                                                useful than a label. */}
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
                                            <IconButton
                                                className="edit-trip-menu-btn"
                                                aria-label="More actions"
                                                onClick={(e) =>
                                                    setEditMenuAnchor(
                                                        e.currentTarget
                                                    )
                                                }
                                                disabled={
                                                    saveItinerary.isPending ||
                                                    deleteItinerary.isPending
                                                }
                                                size="small"
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                            <Menu
                                                anchorEl={editMenuAnchor}
                                                onClose={() =>
                                                    setEditMenuAnchor(null)
                                                }
                                            >
                                                <MenuActionItem
                                                    icon={<EventBusyRoundedIcon />}
                                                    label="Cancel trip"
                                                    onClick={() => {
                                                        setEditMenuAnchor(null);
                                                        setEditConfirm('cancel');
                                                    }}
                                                />
                                                <MenuActionItem
                                                    icon={<DeleteOutlineRoundedIcon />}
                                                    label="Delete trip"
                                                    onClick={() => {
                                                        setEditMenuAnchor(null);
                                                        setEditConfirm('delete');
                                                    }}
                                                    tone="danger"
                                                />
                                            </Menu>
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
                <Dialog
                    open={editConfirm !== null}
                    onClose={() => setEditConfirm(null)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>
                        {editConfirm === 'cancel'
                            ? 'Cancel this trip?'
                            : 'Delete this trip?'}
                    </DialogTitle>
                    <DialogContent>
                        {editConfirm === 'cancel' ? (
                            <p>
                                The trip moves to Cancelled status.
                                Participants will see it as cancelled but the
                                itinerary stays viewable. This can be reversed
                                later by an organizer.
                            </p>
                        ) : (
                            <p>
                                This permanently removes the trip and all its
                                activities. Participants will no longer see it
                                in their list. This cannot be undone.
                            </p>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            type="line"
                            capitalizeType="uppercase"
                            label="Keep trip"
                            onClick={() => setEditConfirm(null)}
                            disabled={
                                saveItinerary.isPending ||
                                deleteItinerary.isPending
                            }
                        />
                        <Button
                            type="standard"
                            capitalizeType="uppercase"
                            label={
                                editConfirm === 'delete'
                                    ? deleteItinerary.isPending
                                        ? 'Deleting…'
                                        : 'Delete'
                                    : saveItinerary.isPending
                                    ? 'Saving…'
                                    : 'Cancel trip'
                            }
                            onClick={handleEditConfirm}
                            disabled={
                                saveItinerary.isPending ||
                                deleteItinerary.isPending
                            }
                        />
                    </DialogActions>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="stepperMain stepperMain--create">
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
                {/* Trailing "Finish" indicator — purely visual. The save
                 *  happens when the user clicks Finish on the last real
                 *  step; activeStep then ticks one past steps.length and
                 *  the TripComplete body renders below. Without this dot
                 *  the stepper looks "stuck" on the last real step even
                 *  after the trip saved. */}
                <Step key="__finish__">
                    <StepLabel StepIconComponent={StepIcon}>Finish</StepLabel>
                </Step>
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
                    {isLastStep && data && (
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
                        <StepperAdvanceContext.Provider value={stepperAdvanceValue}>
                            {steps[activeStep]?.comp}
                        </StepperAdvanceContext.Provider>
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
                    {/*
                      NotifyParticipantsCheckbox intentionally hidden from
                      the wizard's last step entirely. Previous iteration
                      tried two layouts (sandwiched between Back/Finish,
                      then in its own row above) — both crowded the action
                      buttons. `notifyParticipants` defaults to true in
                      this component's state so participants still get an
                      email invite on first save. The toggle UI will
                      return on the TripDetail "share to missed
                      participants" surface (see memory:
                      project_edit_trip_share_to_participants).
                    */}
                    <Grid item lg={12} md={12} xs={12}>
                        <div className="step-actions" data-tour="trip-next-btn">
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
