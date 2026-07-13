import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import moment from 'moment'; // iteration loop in buildExpectedDates uses moment object mutation directly
import { formatDate, isValidDate, tripHasRealActivities } from 'utils';
import './index.scss';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Grid,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Button from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import Menu, { MenuActionItem } from 'components/common/Menu';
import BasicTripInfo from 'components/BasicTripInfo';
import BudgetSummary from 'components/BudgetSummary';
import TripDestinationChip from 'components/TripSteps/TripDestinationChip';
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
import { completeTripWithAi } from 'api/aiFillItineraryApi';
import { BucketListPaywallError } from 'api/bucketListApi';
import { activeLang } from 'i18n';
import { TRIP_STATUS } from 'constants';
import type { SaveItineraryInput } from 'api/hooks/useItineraries';
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

// Ids used to fold the "Step N of M" progress line into the current step's
// heading accessible name, so a screen reader announces progress + the
// question together on each transition ("Step 2 of 6, When are you going?").
const WIZARD_STEP_PROGRESS_ID = 'wizard-step-progress';
const WIZARD_STEP_HEADING_ID = 'wizard-step-heading';

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
    /** Optional callback mirroring the save-in-flight flag up to the
     *  parent (TripSteps) so it can hide title-row chrome (the tour "?")
     *  while the full-bleed "Saving…" spinner is showing. */
    onSavingChange?: (saving: boolean) => void;
}

const StepperComp = ({
    steps = [],
    data,
    onActiveStepChange,
    onSavingChange,
}: StepperCompProps) => {
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));
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
                err instanceof Error ? err.message : t('createTrip.stepper.error.deleteFailed')
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
            setSaveError(t('createTrip.stepper.error.resolveTripType'));
            return;
        }
        const cancelledRow = tripStatuses.find(
            (s) => s.name === TRIP_STATUS.CANCELLED
        );
        if (!cancelledRow) {
            setSaveError(t('createTrip.stepper.error.resolveCancelledStatus'));
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
                err instanceof Error ? err.message : t('createTrip.stepper.error.cancelFailed')
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

    const [activeStep, setActiveStep] = useState(0);
    // Mirror the active step out to TripSteps via the parent callback.
    // PREVIOUSLY this was fired inline inside a setState updater fn,
    // which is run during render → calling the parent's setState
    // there produced "Cannot update a component while rendering a
    // different component" warnings AND aborted the current render
    // (e.g. dispatched trip-seed activities silently failed to commit
    // when this stepper rendered them). Sync via useEffect instead:
    // fires post-commit, never during render.
    useEffect(() => {
        onActiveStepChange?.(activeStep);
    }, [activeStep, onActiveStepChange]);
    // Surface the save-in-flight flag to the parent so it can hide the
    // tour "?" while the "Saving…" spinner is up.
    useEffect(() => {
        onSavingChange?.(saveItinerary.isPending);
    }, [saveItinerary.isPending, onSavingChange]);
    const [skipped, setSkipped] = useState<Set<number>>(new Set<number>());
    const [saveError, setSaveError] = useState<string | null>(null);
    // True for the whole "let us plan it for you" round-trip (save the draft →
    // AI-fill its itinerary → route to the trip). Keeps the busy spinner up
    // past the save step, which resolves before the fill does.
    const [aiPlanning, setAiPlanning] = useState(false);
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
    // Open the paywall once `paywallInfo` is set. We can't call
    // `openModel()` inline in the cap-error handler because the
    // `<PaywallModal>` is only rendered AFTER `paywallInfo` turns truthy —
    // on the first cap hit the ref is still null, so the modal silently
    // never opened and the user had to click Finish twice. Firing here
    // (post-render, ref attached) opens it on the first hit. Each cap
    // error sets a fresh object, so re-hits after a dismiss re-open it.
    useEffect(() => {
        if (paywallInfo) paywallModalRef.current?.openModel();
    }, [paywallInfo]);

    // Move keyboard focus to the current step's heading whenever the wizard
    // mounts or advances/goes back, so screen-reader + keyboard users land on
    // the new question ("When are you going?", "What's your budget?", …)
    // instead of being stranded on the now-replaced Next button. The heading is
    // made programmatically focusable (tabIndex -1) on the fly; its focus
    // outline is suppressed in CSS since it's not a Tab stop. Create-flow only —
    // the ref is unattached in edit mode, so this no-ops there. The ref wraps
    // the WHOLE step region (not just `.step-content`) so the final itinerary
    // step lands focus on the trip-name `.step-trip-name` <h2>, which is a
    // sibling of the step body. On the final "Finish", the move lands focus on
    // the "Trip created" heading of the completion screen (via `completeRef`).
    const stepRegionRef = useRef<HTMLDivElement>(null);
    const completeRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const isComplete = steps.length > 0 && activeStep === steps.length;
        const container = isComplete
            ? completeRef.current
            : stepRegionRef.current;
        if (!container) return;
        // The one-question screens expose a `.trip-step-headline` we control;
        // fall back to the first native heading (the itinerary step's trip-name
        // <h2>, or the completion screen's <h1>).
        const headline =
            container.querySelector<HTMLElement>('.trip-step-headline');
        const heading =
            headline ?? container.querySelector<HTMLElement>('h1, h2');
        if (!heading) return;
        heading.setAttribute('tabindex', '-1');
        // Fold "Step N of M" into the question screen's heading name so the
        // transition announces progress + the question together (WCAG 3.2
        // orientation). Only the single-question steps carry the progress line
        // + a `.trip-step-headline`; the itinerary/completion headings read as
        // their own text.
        if (headline && document.getElementById(WIZARD_STEP_PROGRESS_ID)) {
            headline.id = WIZARD_STEP_HEADING_ID;
            headline.setAttribute(
                'aria-labelledby',
                `${WIZARD_STEP_PROGRESS_ID} ${WIZARD_STEP_HEADING_ID}`
            );
        }
        heading.focus();
    }, [activeStep, steps.length]);

    // In edit mode the "Describe Your Trip!" form opens as a modal triggered
    // by the pencil-edit icon on BasicTripInfo, rather than appearing inline
    // (the summary card already shows that data — duplicating it inline read
    // poorly).
    const basicInfoModalRef = useRef<ModalButtonHandle>(null);

    const isStepSkipped = (step: number) => skipped.has(step);
    const isLastStep = activeStep === steps.length - 1;
    // Destination name for the "plan it for me" nudge copy (single trips set it
    // on the first destination; multi-trips fall back to generic copy).
    const planPlace = data?.destinations?.[0]?.country?.name?.trim();

    // Required-field check for the current step. Matched by step *label*
    // because the one-question-per-screen create flow conditionally renders
    // the Destination step (single-trip-only, when no country was preset),
    // so numeric indices shift. Labels mirror the entries in `TripSteps`.
    const activeLabel = steps[activeStep]?.label;
    // The mode step (single vs. multi) auto-advances the instant the user picks
    // a card (TripModeStep fires onAdvance), so the "Next" button is redundant
    // there — hide it on that step. Step 0 has no Back either, so the actions
    // row is simply empty on the mode screen.
    const isModeStep = activeLabel === 'Trip type';
    const stepMissing: string[] = [];
    // Full-sentence validation errors (vs. `stepMissing`'s noun phrases).
    // Used for constraints that don't read as "Add X" — e.g. a backwards
    // date range. Rendered verbatim and, like stepMissing, blocks Next.
    const stepInvalid: string[] = [];
    const endBeforeStart =
        !!data?.startDate &&
        !!data?.endDate &&
        moment(data.endDate).isBefore(moment(data.startDate), 'day');
    if (data) {
        if (!isEditing && activeLabel === 'Trip type') {
            if (!data.type?.id) stepMissing.push(t('createTrip.stepper.missing.tripType'));
        }
        if (!isEditing && activeLabel === 'Destination') {
            const countryAlreadyPicked = Boolean(
                data.destinations?.[0]?.country?.id ||
                    data.destinations?.[0]?.country?.name
            );
            if (!countryAlreadyPicked) {
                stepMissing.push(t('createTrip.stepper.missing.destinationCountry'));
            }
        }
        if (!isEditing && activeLabel === 'Dates') {
            if (!data.startDate) stepMissing.push(t('createTrip.stepper.missing.startDate'));
            if (!data.endDate) stepMissing.push(t('createTrip.stepper.missing.endDate'));
            if (endBeforeStart) {
                stepInvalid.push(t('createTrip.stepper.invalid.endBeforeStart'));
            }
        }
        if (!isEditing && activeLabel === 'Budget') {
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
                stepMissing.push(t('createTrip.stepper.missing.budget'));
            }
        }
        if (!isEditing && activeLabel === 'Organizers') {
            if (!(data.organizer ?? []).some((o) => o.userId)) {
                stepMissing.push(t('createTrip.stepper.missing.organizer'));
            }
        }
        if (!isEditing && activeLabel === 'Participants') {
            // Participants are required — the current user is auto-seeded
            // into `friends` on mount (see TripSteps), so an empty list
            // means the user actively deselected everyone. Block advance
            // until at least one participant is back.
            if (!(data.friends ?? []).length) {
                stepMissing.push(t('createTrip.stepper.missing.participant'));
            }
        }
        if (isEditing || isLastStep) {
            if (!data.name?.trim()) stepMissing.push(t('createTrip.stepper.missing.tripName'));
            if (!data.startDate) stepMissing.push(t('createTrip.stepper.missing.startDateShort'));
            if (!data.endDate) stepMissing.push(t('createTrip.stepper.missing.endDateShort'));
            if (endBeforeStart) {
                stepInvalid.push(t('createTrip.stepper.invalid.endBeforeStart'));
            }
            if (!(data.organizer ?? []).some((o) => o.userId)) {
                stepMissing.push(t('createTrip.stepper.missing.organizer'));
            }
            if (!(data.friends ?? []).length) {
                stepMissing.push(t('createTrip.stepper.missing.participant'));
            }
            // No per-day place requirement: empty days are allowed
            // through the whole Planning phase. The Confirm step warns
            // the user about empty days and they get hidden on
            // confirm; forcing a place per day here was burning users
            // who knew the trip dates but hadn't planned every day.
        }
    }
    const hasMissingFields = stepMissing.length > 0;
    const hasInvalidFields = stepInvalid.length > 0;
    // Next / Save is blocked by either an unfilled required field OR a
    // failed constraint (e.g. backwards date range).
    const blockAdvance = hasMissingFields || hasInvalidFields;

    /** Validate the draft + build the save payload, or set an inline error and
     *  return null. Shared by the normal Finish save and the "plan it for me"
     *  flow so both enforce the same required-field + date checks. */
    const prepareSaveInput = (): SaveItineraryInput | null => {
        if (!data) return null;
        if (!user) {
            setSaveError(t('createTrip.stepper.error.loginToSave'));
            return null;
        }
        const interaryTypeId = resolveInteraryTypeId(data, itineraryTypes);
        if (!interaryTypeId) {
            setSaveError(t('createTrip.stepper.error.resolveTripTypeSeed'));
            return null;
        }

        const missing: string[] = [];
        if (!data.name?.trim()) missing.push(t('createTrip.stepper.missing.tripName'));
        if (!data.startDate) missing.push(t('createTrip.stepper.missing.startDateShort'));
        if (!data.endDate) missing.push(t('createTrip.stepper.missing.endDateShort'));
        if (!(data.organizer ?? []).some((o) => o.userId)) {
            missing.push(t('createTrip.stepper.missing.organizer'));
        }
        // Participants are required — current user is auto-seeded into
        // `friends`, so an empty list means the user deselected everyone.
        if (!(data.friends ?? []).length) {
            missing.push(t('createTrip.stepper.missing.participant'));
        }
        // No per-day place requirement on save. Empty days are allowed
        // through Planning — they're filtered out automatically after
        // the trip is moved to Confirmed (with a warning modal at the
        // status-change moment).
        if (missing.length) {
            setSaveError(
                t('createTrip.stepper.error.provideBeforeSaving', {
                    fields: missing.join(', '),
                })
            );
            return null;
        }
        if (
            data.startDate &&
            data.endDate &&
            moment(data.endDate).isBefore(moment(data.startDate), 'day')
        ) {
            setSaveError(t('createTrip.stepper.invalid.endBeforeStart'));
            return null;
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

        return tripStateToSaveInput(data, {
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
    };

    const handleSaveAndAdvance = async () => {
        if (!data) {
            setActiveStep((prev) => prev + 1);
            return;
        }
        const input = prepareSaveInput();
        if (!input) return;
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
                // The paywall is opened by the `paywallInfo` effect above
                // (the modal isn't mounted yet on the first cap hit, so an
                // inline openModel() here would no-op against a null ref).
                setPaywallInfo({ currentCount: err.currentCount, cap: err.cap });
                setSaveError(null);
                return;
            }
            const message =
                err instanceof Error ? err.message : t('createTrip.stepper.error.saveFailed');
            setSaveError(message);
        }
    };

    /** "Can't decide? Let us plan it for you" — save the draft, then have the
     *  AI fill its empty days (keeping the flight) and land on the finished
     *  trip. Pro-only; non-Pro users are routed to the membership upsell
     *  before anything is saved. */
    const handlePlanForMe = async () => {
        if (!isPro) {
            navigate('/membership');
            return;
        }
        const input = prepareSaveInput();
        if (!input) return;
        setAiPlanning(true);
        setSaveError(null);
        try {
            const saved = await saveItinerary.mutateAsync(input);
            await completeTripWithAi(saved.id, activeLang());
            navigate(`/trip-detail?id=${saved.id}`);
        } catch (err) {
            if (isTripCapReachedError(err)) {
                setPaywallInfo({ currentCount: err.currentCount, cap: err.cap });
                return;
            }
            if (err instanceof BucketListPaywallError) {
                navigate('/membership');
                return;
            }
            setSaveError(
                err instanceof Error
                    ? err.message
                    : t('createTrip.stepper.error.saveFailed')
            );
        } finally {
            setAiPlanning(false);
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
        // Reuse TripDetail's status-themed wrapper so the basic-info
        // card, budget summary, friend chips, and stat icons render in
        // the trip's lifecycle color (orange for Planning, green for
        // Confirmed, etc.) instead of the default green wash. Same
        // CSS variables defined in src/components/Sections/TripDetail/index.scss.
        const editStatusName = (
            (data?.status && typeof data.status === 'object' && data.status.name) ||
            'Planning'
        ).toLowerCase();
        return (
            <div
                className={`stepperMain stepperMain--edit trip-detail-themed trip-detail-status-${editStatusName}`}
            >
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
                            {t('createTrip.stepper.savingChanges')}
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
                                                {data.name || t('createTrip.stepper.untitledTrip')}
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
                                                label={t('common.cancel')}
                                                onClick={handleCancelEdit}
                                                disabled={saveItinerary.isPending}
                                            />
                                            <Button
                                                type="standard"
                                                capitalizeType="uppercase"
                                                className="edit-trip-save-btn"
                                                label={
                                                    saveItinerary.isPending
                                                        ? t('common.saving')
                                                        : t('createTrip.stepper.saveChanges')
                                                }
                                                onClick={() =>
                                                    void handleSaveAndAdvance()
                                                }
                                                disabled={
                                                    saveItinerary.isPending ||
                                                    blockAdvance
                                                }
                                            />
                                            <IconButton
                                                className="edit-trip-menu-btn"
                                                aria-label={t('createTrip.stepper.moreActions')}
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
                                                    label={t('createTrip.stepper.cancelTrip')}
                                                    onClick={() => {
                                                        setEditMenuAnchor(null);
                                                        setEditConfirm('cancel');
                                                    }}
                                                />
                                                <MenuActionItem
                                                    icon={<DeleteOutlineRoundedIcon />}
                                                    label={t('createTrip.stepper.deleteTrip')}
                                                    onClick={() => {
                                                        setEditMenuAnchor(null);
                                                        setEditConfirm('delete');
                                                    }}
                                                    tone="danger"
                                                />
                                            </Menu>
                                        </div>
                                    </div>
                                    {saveError ? (
                                        <ErrorAlert>{saveError}</ErrorAlert>
                                    ) : hasInvalidFields ? (
                                        <ErrorAlert>
                                            {stepInvalid.join(' ')}
                                        </ErrorAlert>
                                    ) : hasMissingFields ? (
                                        <ErrorAlert>
                                            {t('createTrip.stepper.addToContinue', {
                                                fields: stepMissing.join(', '),
                                            })}
                                        </ErrorAlert>
                                    ) : null}
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
                        <ModalButton
                            ref={basicInfoModalRef}
                            title={t('createTrip.stepper.editTripInfo')}
                            containerClassName="edit-trip-info-modal"
                        >
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
                                    label={t('createTrip.stepper.done')}
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
                    aria-labelledby="stepper-edit-confirm-dialog-title"
                >
                    <DialogTitle id="stepper-edit-confirm-dialog-title">
                        {editConfirm === 'cancel'
                            ? t('createTrip.stepper.cancelDialog.title')
                            : t('createTrip.stepper.deleteDialog.title')}
                    </DialogTitle>
                    <DialogContent>
                        {editConfirm === 'cancel' ? (
                            <p>{t('createTrip.stepper.cancelDialog.body')}</p>
                        ) : (
                            <p>{t('createTrip.stepper.deleteDialog.body')}</p>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            type="line"
                            capitalizeType="uppercase"
                            label={t('createTrip.stepper.keepTrip')}
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
                                        ? t('createTrip.stepper.deleting')
                                        : t('createTrip.stepper.delete')
                                    : saveItinerary.isPending
                                    ? t('common.saving')
                                    : t('createTrip.stepper.cancelTrip')
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
            {/* The step-indicator row that used to sit here is intentionally
             *  gone — the create flow now asks one self-explanatory question
             *  per screen, so the stepper added clutter (especially on
             *  mobile) without helping the user. Progress is implicit in the
             *  Back/Next buttons. */}
            {activeStep === steps.length ? (
                <div ref={completeRef}>
                    <TripComplete onReset={handleReset} />
                </div>
            ) : saveItinerary.isPending || aiPlanning ? (
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
                        {aiPlanning
                            ? t('createTrip.stepper.aiPlanning')
                            : t('createTrip.stepper.savingTrip')}
                    </span>
                </div>
            ) : (
                <Grid container ref={stepRegionRef}>
                    {isLastStep && data && (
                        <Grid item lg={12} md={12} xs={12}>
                            {/* On the itinerary step we just show the trip
                             *  name as a title — the full basic-info card +
                             *  budget summary lived here before but read as
                             *  clutter above the day-by-day planner. */}
                            <h2 className="step-trip-name">
                                {data.name?.trim() || t('createTrip.stepper.yourTrip')}
                            </h2>
                        </Grid>
                    )}

                    {/* "Can't decide?" — only on the (manual) itinerary step
                     *  while it's still empty (just the flight). Users who
                     *  asked AI to plan from the start never reach this step. */}
                    {isLastStep &&
                        data &&
                        !tripHasRealActivities(data.destinations) && (
                        <Grid item lg={12} md={12} xs={12}>
                            <div className="step-ai-plan">
                                <span
                                    className="step-ai-plan-icon"
                                    aria-hidden="true"
                                >
                                    <AutoAwesomeRoundedIcon />
                                </span>
                                <div className="step-ai-plan-text">
                                    <span className="step-ai-plan-badge">
                                        {t('createTrip.stepper.aiPlan.badge')}
                                    </span>
                                    <span className="step-ai-plan-title">
                                        {t('createTrip.stepper.aiPlan.title')}
                                    </span>
                                    <span className="step-ai-plan-sub">
                                        {planPlace
                                            ? t(
                                                  'createTrip.stepper.aiPlan.subWithPlace',
                                                  { place: planPlace }
                                              )
                                            : t('createTrip.stepper.aiPlan.sub')}
                                    </span>
                                </div>
                                <Button
                                    type="standard"
                                    capitalizeType="none"
                                    className="step-ai-plan-btn"
                                    onClick={() => void handlePlanForMe()}
                                    disabled={
                                        saveItinerary.isPending || aiPlanning
                                    }
                                >
                                    <AutoAwesomeRoundedIcon className="step-ai-plan-btn-icon" />
                                    <span>
                                        {t('createTrip.stepper.aiPlan.cta')}
                                    </span>
                                </Button>
                            </div>
                        </Grid>
                    )}

                    {!isLastStep && data && (
                        <Grid item lg={12} md={12} xs={12}>
                            {/* Persistent "Going to <place>" banner — kept
                             *  above every step's question so the user never
                             *  loses sight of the destination. Renders null
                             *  until a country is set. The last (Itinerary)
                             *  step shows the trip name title instead. */}
                            <TripDestinationChip data={data} />
                        </Grid>
                    )}
                    {/* "Step N of M" — orientation for everyone, and folded
                     *  into the current question's heading name (see the focus
                     *  effect) so a screen reader announces "Step 2 of 6, When
                     *  are you going?" on each transition. */}
                    <Grid item lg={12} md={12} xs={12}>
                        <p className="step-progress" id={WIZARD_STEP_PROGRESS_ID}>
                            {t('createTrip.stepper.progress', {
                                current: activeStep + 1,
                                total: steps.length,
                            })}
                        </p>
                    </Grid>
                    <Grid item lg={12} md={12} xs={12}>
                        <div className="step-content">
                            <StepperAdvanceContext.Provider
                                value={stepperAdvanceValue}
                            >
                                {steps[activeStep]?.comp}
                            </StepperAdvanceContext.Provider>
                        </div>
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
                    {!saveError && hasInvalidFields && (
                        <Grid item lg={12} md={12} xs={12}>
                            <ErrorAlert>{stepInvalid.join(' ')}</ErrorAlert>
                        </Grid>
                    )}
                    {!saveError && !hasInvalidFields && hasMissingFields && (
                        <Grid item lg={12} md={12} xs={12}>
                            <ErrorAlert>
                                {t('createTrip.stepper.addToContinue', {
                                    fields: stepMissing.join(', '),
                                })}
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
                        <div
                            className={classnames('step-actions', {
                                // Last step (Itinerary) is full-width, so let
                                // the actions span the whole row and pin
                                // Back/Finish to the corners. The single-
                                // question steps stay capped to the 720px
                                // card column.
                                'step-actions--full': isLastStep,
                            })}
                            data-tour="trip-next-btn"
                        >
                            {activeStep > 0 && (
                                <Button
                                    type="line"
                                    onClick={handleBack}
                                    label={t('createTrip.back')}
                                />
                            )}
                            {!isModeStep && (
                                <Button
                                    type="standard"
                                    onClick={handleNext}
                                    label={
                                        isLastStep
                                            ? saveItinerary.isPending
                                                ? t('common.saving')
                                                : t('createTrip.stepper.finish')
                                            : t('createTrip.next')
                                    }
                                    disabled={
                                        blockAdvance ||
                                        (isLastStep && saveItinerary.isPending)
                                    }
                                />
                            )}
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
