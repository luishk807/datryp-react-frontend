import { useMemo, useRef, useState } from 'react';
import './index.scss';
import classnames from 'classnames';
import { formatDate, isSameDay, isValidDate } from 'utils';
import IconButton from '@mui/material/IconButton';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Tooltip } from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ErrorAlert from 'components/common/ErrorAlert';
import DialogBox from 'components/common/FormFields/DialogBox';
import TripStatusBadge from 'components/TripStatusBadge';
import { useBudgetSuggestion } from 'hooks/useBudgetSuggestion';
import { useUser } from 'context/UserContext';
import { convertMoney } from 'utils';
import { TRIP_STATUS } from 'constants';
import type { TripState, TripStatus } from 'types';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    /** Persists the new trip status. Returning a promise keeps the modal
     *  open with a "Saving…" label until the save round-trips, then it
     *  closes. The parent owns the actual mutation. */
    onStatusChange?: (status: TripStatus) => void | Promise<void>;
    onExportExcel?: () => void;
    onSaveTrip?: () => void;
    /** Flip the page into edit mode (show all activity edit icons, etc.).
     *  When provided AND `isEditMode` is false, the primary button reads
     *  "Edit Trip" and clicking calls this instead of `onSaveTrip`. */
    onEnterEditMode?: () => void;
    /** Whether the parent is currently in edit mode. Drives the primary
     *  button's label + click target ("Edit Trip" vs "Save Trip"). */
    isEditMode?: boolean;
    /** Hide the small pencil icon next to the trip name even when
     *  `isViewMode` is false. Used on `/trip-detail` where the dedicated
     *  Edit Trip button already covers the same navigation — the pencil
     *  would be a redundant affordance. The status-badge pencil stays
     *  gated by `isViewMode` only. */
    hideEditPencil?: boolean;
    /** One-click promote Confirmed → Completed. Does its own save (no
     *  separate Save Trip click needed), so we hide Save Trip whenever this
     *  is provided. */
    onMarkCompleted?: () => void;
    onCancel?: () => void;
    onDeleteTrip?: () => void;
    isSaving?: boolean;
    isDeleting?: boolean;
    isDirty?: boolean;
    saveError?: string | null;
    isViewMode?: boolean;
    /** When true, the stats row + friends chip list collapse behind a
     *  toggle button. The header (trip name + status + action buttons)
     *  stays visible regardless. Used on /trip-detail post-confirmation
     *  where the user mostly wants to see activities and only
     *  occasionally needs the overview. */
    collapsible?: boolean;
    /** Initial collapse state when `collapsible` is true. Defaults to
     *  `false` (stats visible). */
    defaultCollapsed?: boolean;
    /** Externally-controlled collapse state. When provided, overrides
     *  the internal toggle button — used by `/trip-detail` which drives
     *  ONE Show/Hide detail button governing both BasicTripInfo and
     *  BudgetSummary together. */
    collapsed?: boolean;
    /** Hide the internal chevron toggle. Pair with controlled
     *  `collapsed` when the parent renders its own single toggle. */
    hideToggle?: boolean;
    /** Hide the header chunk (trip name + status badge + action
     *  buttons). TripDetail hoists those into its own always-visible
     *  row at the top and uses this to render the stats/friends body
     *  alone inside the collapsible section below. */
    hideHeader?: boolean;
    /** Opens the basic-info edit modal — paired with `hideHeader=true`
     *  so the edit-trip flow can keep the title/actions in a standalone
     *  header row at the top while the basic-info card itself still
     *  carries an "Edit basic info" affordance for the stats block. */
    onEditBasicInfo?: () => void;
}

const deriveStatusName = (raw: TripState['status']): string => {
    if (raw && typeof raw === 'object' && raw.name) return raw.name;
    return TRIP_STATUS.PLANNING;
};

export const BasicTripInfo = ({
    data,
    onChangeStep,
    onStatusChange,
    onExportExcel,
    onSaveTrip,
    onEnterEditMode,
    isEditMode = false,
    hideEditPencil = false,
    onMarkCompleted,
    onCancel,
    onDeleteTrip,
    isSaving = false,
    isDeleting = false,
    isDirty = false,
    saveError = null,
    isViewMode = false,
    collapsible = false,
    defaultCollapsed = false,
    collapsed: controlledCollapsed,
    hideToggle = false,
    hideHeader = false,
    onEditBasicInfo,
}: BasicTripInfoProps) => {
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    // Externally-controlled collapse wins when provided. Falls back to the
    // internal state machine for self-managed call sites.
    const collapsed =
        controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
    const setCollapsed = (next: boolean) => setInternalCollapsed(next);
    const exportModalRef = useRef<ModalButtonHandle>(null);

    /** Native browser print of the current page. Pages that want a
     *  proper print stylesheet can add `@media print` rules; for now we
     *  hand off to the browser's built-in print preview. */
    const handlePrint = () => {
        exportModalRef.current?.closeModal();
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleDownloadExcel = () => {
        exportModalRef.current?.closeModal();
        onExportExcel?.();
    };

    const tripDate = useMemo(() => {
        if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) return '—';
        if (isSameDay(data.startDate, data.endDate)) return formatDate(data.startDate, 'MMM D, YYYY');
        return `${formatDate(data.startDate, 'MMM D')} → ${formatDate(data.endDate, 'MMM D, YYYY')}`;
    }, [data]);

    const organizer = useMemo(
        () =>
            (data.organizer ?? [])
                .map((item) => item.label)
                .filter(Boolean)
                .join(', '),
        [data]
    );

    // Destination country/countries — deduped (helps when a multi-destination
    // trip has two stops in the same country). Each carries its `code` so the
    // "Where" stat can render every country as a /country?code= link rather
    // than a plain text label.
    const destinationCountries = useMemo(() => {
        const seen = new Set<string>();
        const out: { name: string; code?: string }[] = [];
        for (const d of data.destinations ?? []) {
            const name = d.country?.name;
            if (!name) continue;
            const key = (d.country?.code ?? name).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ name, code: d.country?.code });
        }
        return out;
    }, [data.destinations]);
    const destinationLabel = destinationCountries.map((c) => c.name).join(', ');

    const statusName = deriveStatusName(data.status);
    const friends = data.friends ?? [];

    // AI budget verdict — fires the same `/budgets/suggest` call the
    // wizard + edit modal use, then maps the comparison (user budget
    // vs AI estimate) onto a colored arrow + a "why" tooltip directly
    // under the BUDGET tile. The hook is read-only here (autoFill =
    // false): the user's saved budget is the source of truth; we just
    // surface whether it's tight / right-sized / cushioned relative
    // to what the AI would suggest for this destination + length.
    const { user: currentUser, isLoading: isUserLoading } = useUser();
    const tripDays = (() => {
        if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) {
            return null;
        }
        const ms =
            new Date(data.endDate).getTime() -
            new Date(data.startDate).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
        return days >= 1 && days <= 90 ? days : null;
    })();
    const budgetCountryCode = data.destinations?.[0]?.country?.code ?? null;
    const budgetCountryName = data.destinations?.[0]?.country?.name ?? null;
    const { suggestion: budgetSuggestion } = useBudgetSuggestion({
        countryCode: budgetCountryCode,
        city: null,
        days: tripDays,
        startDate: data.startDate ?? null,
        travelStyle: currentUser?.travelerStyles?.[0] ?? null,
        homeCountryCode: currentUser?.homeCountryCode ?? null,
        homeCity: currentUser?.homeCity ?? null,
        enabled: !isUserLoading,
        currentBudget: String(data.budget ?? ''),
        autoFill: false,
    });

    // Map (user budget / AI estimate) onto a 3-state verdict. Bands
    // are intentionally wide (0.7–1.3) so small rounding differences
    // don't keep flipping the indicator. The "why" text leans on the
    // AI's own `note` when available, falling back to a generic
    // comparison sentence otherwise.
    const budgetNum = Number(data.budget);
    const suggestedTotal = budgetSuggestion?.suggestedTotal ?? null;
    const aiNote = budgetSuggestion?.note ?? null;
    const budgetVerdict = (() => {
        if (suggestedTotal == null || !suggestedTotal) return null;
        if (!Number.isFinite(budgetNum) || budgetNum <= 0) return null;
        const ratio = budgetNum / suggestedTotal;
        const suggestedLabel = `$${suggestedTotal.toLocaleString()}`;
        const destination = budgetCountryName ? ` for ${budgetCountryName}` : '';
        if (ratio < 0.7) {
            return {
                tone: 'low' as const,
                label: 'Tight',
                why:
                    `We estimate about ${suggestedLabel}${destination}. ` +
                    `Your budget is ${Math.round((1 - ratio) * 100)}% under — ` +
                    `you may need to economize on lodging or dining.` +
                    (aiNote ? ` ${aiNote}` : ''),
            };
        }
        if (ratio > 1.3) {
            return {
                tone: 'high' as const,
                label: 'Comfortable',
                why:
                    `We estimate about ${suggestedLabel}${destination}. ` +
                    `You have ${Math.round((ratio - 1) * 100)}% cushion — ` +
                    `room for upgrades or memorable splurges.` +
                    (aiNote ? ` ${aiNote}` : ''),
            };
        }
        return {
            tone: 'on' as const,
            label: 'On target',
            why:
                `We estimate about ${suggestedLabel}${destination}. ` +
                `Your budget lines up with typical spend for this trip.` +
                (aiNote ? ` ${aiNote}` : ''),
        };
    })();

    // Mark Completed is a one-click promote that owns its own save (the parent
    // resolves the Completed UUID and calls saveItinerary directly). When this
    // prop is provided we hide Save Trip — there's nothing to save at the
    // activity level once the trip is Confirmed (activities are locked) and
    // the only legitimate change is the status promotion this button performs.
    const showMarkCompleted =
        statusName === TRIP_STATUS.CONFIRMED && !!onMarkCompleted;

    // The right-side pill is the entry point into the status modal — only the
    // Planning state needs it (to promote to Confirmed). Once Confirmed/Completed/
    // Cancelled, the inline status next to the title is the canonical display.
    const showStatusPill =
        statusName === TRIP_STATUS.PLANNING && !!onStatusChange;

    return (
        <section
            className={`basic-trip-info${hideHeader ? ' is-body-only' : ''}`}
        >
            {!hideHeader && (
            <div className="trip-header">
                <div className="trip-header-left">
                    <div className="trip-name-row">
                        <h2 className="trip-name">{data.name || 'Untitled trip'}</h2>
                        {statusName === TRIP_STATUS.CONFIRMED && (
                            <Tooltip
                                title="Trip confirmed — places are locked in. Click Mark Completed when the trip is done."
                                arrow
                            >
                                <span
                                    className="trip-status-inline trip-status-inline-confirmed"
                                    aria-label={`Trip status: ${statusName}`}
                                >
                                    <CheckCircleOutlineRoundedIcon className="trip-status-inline-icon" />
                                </span>
                            </Tooltip>
                        )}
                        {statusName === TRIP_STATUS.COMPLETED && (
                            <Tooltip title="Completed" arrow>
                                <span
                                    className="trip-status-inline trip-status-inline-completed"
                                    aria-label={`Trip status: ${statusName}`}
                                >
                                    <CheckCircleRoundedIcon className="trip-status-inline-icon" />
                                </span>
                            </Tooltip>
                        )}
                        {statusName === TRIP_STATUS.CANCELLED && (
                            <span
                                className="trip-status-inline trip-status-inline-cancelled"
                                aria-label={`Trip status: ${statusName}`}
                            >
                                ({statusName})
                            </span>
                        )}
                        {!isViewMode && !hideEditPencil && statusName === TRIP_STATUS.PLANNING && (
                            <IconButton
                                size="small"
                                aria-label="Edit trip"
                                className="trip-name-edit"
                                onClick={() => onChangeStep(0)}
                            >
                                <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                        )}
                    </div>
                </div>
                <div className="trip-header-right">
                    {onExportExcel && (
                        <span className="trip-export-wrapper">
                            <ModalButton
                                ref={exportModalRef}
                                title="Download trip"
                                buttonProps={{
                                    type: 'standard',
                                    className: 'trip-export-btn',
                                    Icon: IosShareIcon,
                                    iconProps: { fontSize: 'small' },
                                    title: 'Download',
                                    ariaLabel: 'Download trip',
                                }}
                            >
                                <div className="trip-export-options">
                                    <button
                                        type="button"
                                        className="trip-export-option"
                                        onClick={handlePrint}
                                    >
                                        <PrintOutlinedIcon className="trip-export-option-icon" />
                                        <span className="trip-export-option-text">
                                            <span className="trip-export-option-title">
                                                Print
                                            </span>
                                            <span className="trip-export-option-hint">
                                                Opens your browser's print
                                                preview — save as PDF or send
                                                to a printer.
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="trip-export-option"
                                        onClick={handleDownloadExcel}
                                    >
                                        <TableChartOutlinedIcon className="trip-export-option-icon" />
                                        <span className="trip-export-option-text">
                                            <span className="trip-export-option-title">
                                                Download Excel
                                            </span>
                                            <span className="trip-export-option-hint">
                                                Day-by-day .xlsx with
                                                activities, times, and budget.
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </ModalButton>
                        </span>
                    )}
                    {onCancel && (
                        <ButtonCustom
                            type="line"
                            capitalizeType="uppercase"
                            className="trip-cancel-btn"
                            label="Cancel"
                            onClick={onCancel}
                            disabled={isSaving}
                        />
                    )}
                    {/* Trip-detail page wires onEnterEditMode to "navigate to
                     *  the stepper editor" — same behavior as the trip-name
                     *  pencil icon, just a more discoverable big-button CTA.
                     *  The new-trip stepper passes onSaveTrip instead, which
                     *  is the classic save-this-form button. */}
                    {onEnterEditMode && !isEditMode && (
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            className="trip-save-btn"
                            label="Edit Trip"
                            onClick={onEnterEditMode}
                            disabled={isSaving}
                        />
                    )}
                    {onSaveTrip && (isEditMode || !onEnterEditMode) && (
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            className="trip-save-btn"
                            label={isSaving ? 'Saving…' : 'Save Trip'}
                            onClick={onSaveTrip}
                            disabled={!isDirty || isSaving}
                        />
                    )}
                    {showMarkCompleted && (
                        <span className="trip-mark-complete-wrapper">
                            <DialogBox
                                buttonLabel={isSaving ? 'Saving…' : 'Mark Completed'}
                                buttonType="line"
                                title="Mark this trip as completed?"
                                onConfirm={onMarkCompleted}
                            >
                                This marks the trip as completed and locks it
                                from further changes. The itinerary stays
                                visible in your list, but you won't be able
                                to edit places or budgets afterward.
                            </DialogBox>
                        </span>
                    )}
                    {onDeleteTrip && (
                        <span className="trip-delete-wrapper">
                            <DialogBox
                                buttonLabel={isDeleting ? 'Deleting…' : 'Delete Trip'}
                                buttonType="line"
                                title="Delete this trip?"
                                onConfirm={onDeleteTrip}
                            >
                                This permanently removes the trip and all its
                                activities. Participants will no longer see it
                                in their list. This cannot be undone.
                            </DialogBox>
                        </span>
                    )}
                    {showStatusPill && onStatusChange && (
                        <TripStatusBadge
                            data={data}
                            onStatusChange={onStatusChange}
                            isSaving={isSaving}
                            disabled={isViewMode}
                        />
                    )}
                    {collapsible && !hideToggle && (
                        <IconButton
                            size="small"
                            className={classnames('trip-collapse-toggle', {
                                'is-collapsed': collapsed,
                            })}
                            aria-label={
                                collapsed
                                    ? 'Show trip details'
                                    : 'Hide trip details'
                            }
                            aria-expanded={!collapsed}
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            <ExpandMoreRoundedIcon />
                        </IconButton>
                    )}
                </div>
            </div>
            )}

            {saveError && !hideHeader && (
                <ErrorAlert className="trip-save-error">{saveError}</ErrorAlert>
            )}

            <div
                className={classnames('trip-collapsible-body', {
                    'is-collapsed': collapsible && collapsed,
                })}
                aria-hidden={collapsible && collapsed ? true : undefined}
            >
            {hideHeader && onEditBasicInfo && (
                <div className="trip-edit-basic-row">
                    <ButtonIcon
                        type="text"
                        title="Edit basic info"
                        className="trip-edit-basic-btn"
                        onClick={onEditBasicInfo}
                        Icon={EditOutlinedIcon}
                        iconPosition="start"
                    />
                </div>
            )}
            <div className="trip-stats">
                <div className="trip-stat">
                    <PersonOutlineIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">Organizer</span>
                        <span className="stat-value">{organizer || '—'}</span>
                    </div>
                </div>
                {destinationCountries.length > 0 && (
                    <div className="trip-stat">
                        <PublicOutlinedIcon className="stat-icon" />
                        <div className="stat-text">
                            <span className="stat-label">Where</span>
                            <span className="stat-value">
                                {destinationCountries.map((c, idx) => (
                                    <span key={`${c.code ?? c.name}-${idx}`}>
                                        {idx > 0 && ', '}
                                        {c.code ? (
                                            <a
                                                className="stat-value-link"
                                                href={`/country?code=${encodeURIComponent(
                                                    c.code
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Open ${c.name} in a new tab`}
                                            >
                                                {c.name}
                                            </a>
                                        ) : (
                                            c.name
                                        )}
                                    </span>
                                ))}
                            </span>
                        </div>
                    </div>
                )}
                <div className="trip-stat">
                    <EventOutlinedIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">When</span>
                        <span className="stat-value">{tripDate}</span>
                    </div>
                </div>
                <div className="trip-stat">
                    <PaymentsOutlinedIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">Budget</span>
                        <div className="stat-value-row">
                            <span className="stat-value">{convertMoney(data.budget)}</span>
                            {budgetVerdict && (
                                <span
                                    className={classnames(
                                        'budget-verdict',
                                        `budget-verdict-${budgetVerdict.tone}`,
                                    )}
                                >
                                {budgetVerdict.tone === 'low' && (
                                    <TrendingDownRoundedIcon
                                        className="budget-verdict-arrow"
                                        fontSize="small"
                                    />
                                )}
                                {budgetVerdict.tone === 'on' && (
                                    <TrendingFlatRoundedIcon
                                        className="budget-verdict-arrow"
                                        fontSize="small"
                                    />
                                )}
                                {budgetVerdict.tone === 'high' && (
                                    <TrendingUpRoundedIcon
                                        className="budget-verdict-arrow"
                                        fontSize="small"
                                    />
                                )}
                                <span className="budget-verdict-label">
                                    {budgetVerdict.label}
                                </span>
                                <Tooltip
                                    title={budgetVerdict.why}
                                    arrow
                                    placement="top"
                                    enterTouchDelay={0}
                                    leaveTouchDelay={6000}
                                >
                                    <InfoOutlinedIcon
                                        className="budget-verdict-why"
                                        fontSize="small"
                                        tabIndex={0}
                                        aria-label={budgetVerdict.why}
                                    />
                                </Tooltip>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {friends.length > 0 && (
                <div className="trip-friends">
                    <div className="trip-friends-header">
                        <GroupOutlinedIcon className="stat-icon" />
                        <span className="stat-label">Who's going</span>
                    </div>
                    <div className="friend-chips">
                        {friends.map((f, idx) => (
                            <span className="friend-chip" key={idx}>
                                {f.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </section>
    );
};

export default BasicTripInfo;
