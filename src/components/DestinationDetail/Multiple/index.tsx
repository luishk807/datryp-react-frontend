import _ from 'lodash';
import moment from 'moment';
import { convertMoney, formatDate, isSameDay, isValidDate, reformatDate } from 'utils';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import './index.scss';
import { TRIP_BASIC, ACTIVITY_KIND } from 'constants';
import Activities from 'components/DestinationDetail/Activities';
import AddBudget from 'components/DestinationDetail/AddBudget';
import AddDestinationBtn from 'components/common/AddDestination';
import AirlineLogo from 'components/common/AirlineLogo';
import DialogBox from 'components/common/FormFields/DialogBox';
import type {
    ActionType,
    Activity,
    BudgetEntry,
    BudgetItem,
    Destination,
    FlightInfo,
    Friend,
} from 'types';

const segHasData = (seg?: FlightInfo) =>
    Boolean(seg && (seg.flightNumber || seg.departAirport || seg.arrivalAirport));

const formatLegDate = (value?: string) =>
    value && isValidDate(value) ? formatDate(value, 'MMM D, YYYY') : '';

const formatLegTime = (value?: string) =>
    value && isValidDate(value, 'HH:mm') ? reformatDate(value, 'HH:mm', 'LT') : '';

const formatLegMeta = (date?: string, time?: string) => {
    const parts = [formatLegDate(date), formatLegTime(time)].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Not set';
};

interface DestinationDay {
    date: string;
    activities: Activity[];
}

const isoKey = (value: string): string =>
    isValidDate(value) ? formatDate(value, 'YYYY-MM-DD') : value;

/** Expand a destination into one entry per day across its
 *  [startDate, endDate] range, attaching each day's activities (empty when a
 *  day has none yet). The destination's ARRIVAL flight renders in the header
 *  band, not as a card — but ONLY that one is hidden, so a flight the user adds
 *  as an activity still shows. The arrival lives either on `dest.flightInfo`
 *  (modal-added: real segment data) or, for the country-page seed, as a flight
 *  activity (with `dest.flightInfo` a bare stub). Saved days outside the
 *  computed range are appended defensively so no real activity is hidden. A
 *  destination with no usable range collapses to a single day on its start. */
const buildDestinationDays = (dest: Destination): DestinationDay[] => {
    // When the header is the destination's own flightInfo, every flight
    // activity is the user's and shows. Otherwise (seed stub) the FIRST flight
    // activity is the arrival that feeds the header — drop just that one.
    const headerFromFlightInfo =
        (dest.flightInfo?.segments ?? []).some(segHasData) ||
        Boolean(dest.flightInfo?.flightNumber) ||
        Boolean(dest.flightInfo?.departAirport);
    let droppedHeaderFlight = false;
    const keepActivity = (a: Activity): boolean => {
        if (a.kind !== ACTIVITY_KIND.FLIGHT) return true;
        if (headerFromFlightInfo) return true;
        if (!droppedHeaderFlight) {
            droppedHeaderFlight = true;
            return false;
        }
        return true;
    };

    const byDate = new Map<string, Activity[]>();
    for (const day of dest.itinerary ?? []) {
        const key = isoKey(day.date);
        const acts = (day.activities ?? []).filter(keepActivity);
        byDate.set(key, [...(byDate.get(key) ?? []), ...acts]);
    }

    const days: DestinationDay[] = [];
    const start = dest.startDate;
    const end = dest.endDate || start;
    if (start && isValidDate(start)) {
        let cur = moment(start);
        const last = end && isValidDate(end) ? moment(end) : cur.clone();
        let guard = 0;
        while (cur.isSameOrBefore(last, 'day') && guard < 370) {
            const iso = cur.format('YYYY-MM-DD');
            days.push({ date: iso, activities: byDate.get(iso) ?? [] });
            byDate.delete(iso);
            cur = cur.clone().add(1, 'day');
            guard += 1;
        }
    }
    for (const day of dest.itinerary ?? []) {
        const key = isoKey(day.date);
        if (byDate.has(key)) {
            const acts = byDate.get(key) ?? [];
            // Only surface an out-of-range saved day when it actually carries
            // activities. An EMPTY out-of-range day is a stale phantom — e.g. a
            // day that belonged to this destination before a later destination
            // shrank its range — and would render a confusing duplicate date
            // (the day now belongs to the next destination's block).
            if (acts.length > 0) {
                days.push({ date: key, activities: acts });
            }
            byDate.delete(key);
        }
    }
    if (days.length === 0) {
        days.push({ date: start ?? '', activities: [] });
    }
    return days;
};

export interface MultipleProps {
    defaultDate?: string;
    tripMaxDate?: string | null;
    trips?: Destination[] | null;
    /** Full destinations array from TripState, unfiltered. Used to compute
     *  each filtered trip's real index in the parent state — the index that
     *  movePlace expects in dnd-kit's drag-end payload. */
    allDestinations?: Destination[];
    /** Previous destination's country when this one arrives the same calendar
     *  day (same-day flight boundary). Renders a "same day — after X" marker so
     *  the repeated date reads as a transition, not a duplicate. */
    sameDayFromCountry?: string;
    onChangeDestination: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown, destinationIndx?: number) => void;
    /** `date` targets a specific day inside a multi-day destination so the
     *  added activity lands on that day rather than the destination's start. */
    onChangePlace: (
        type: ActionType,
        value: unknown,
        destinationIndx?: number,
        date?: string,
    ) => void;
    participants?: Friend[];
    isViewMode?: boolean;
    /** Disable the per-activity status pill (new-trip flow only). */
    lockActivityStatus?: boolean;
    /** Opt-in override for the status pill — forwarded unchanged. */
    allowStatusToggle?: boolean;
    /** Opt-in override for Mark-as-paid / edit-paid — forwarded. */
    allowPaidEdits?: boolean;
    /** Forwarded to Activities so post-planning UI can render. */
    tripStatusName?: string;
    /** Forwarded to Activities so the status pill disables itself
     *  while the parent's auto-save is in flight. */
    isAutoSaving?: boolean;
}

const Multiple = ({
    defaultDate,
    tripMaxDate,
    trips = [],
    allDestinations = [],
    sameDayFromCountry,
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
    isViewMode = false,
    lockActivityStatus = false,
    allowStatusToggle,
    allowPaidEdits,
    tripStatusName,
    isAutoSaving = false,
}: MultipleProps) => {
    return (
        <>
            {(trips ?? []).map((trip, indx) => {
                    const flightInfo = _.get(trip, 'flightInfo') as
                        | FlightInfo
                        | undefined;
                    const country = _.get(trip, 'country.name') as
                        | string
                        | undefined;
                    // One section per day across this destination's range, so a
                    // multi-day stay shows each day (with its own Add Activity)
                    // instead of collapsing everything onto day 1.
                    const days = buildDestinationDays(trip);

                    // Legacy trips persist the destination's arrival flight
                    // BOTH as `flightInfo` (drives this header band) AND as a
                    // first-day itinerary activity (kind === FLIGHT). That made
                    // the flight render twice — once in the header, once as an
                    // activity card. Consolidate into the header only: find the
                    // flight activity, prefer whichever source carries real
                    // flight data, and filter the activity out of the card list
                    // below so it never duplicates.
                    const flightActivity = (trip.itinerary ?? [])
                        .flatMap((d) => d.activities ?? [])
                        .find((a) => a.kind === ACTIVITY_KIND.FLIGHT);

                    // Unified header segment list: prefer flightInfo's segments
                    // when at least one is populated, then the flight
                    // activity's segments, then flightInfo's flat fields as a
                    // single legacy leg.
                    const flightInfoSegments = flightInfo?.segments?.some(
                        segHasData,
                    )
                        ? flightInfo.segments
                        : undefined;
                    const headerSegments: FlightInfo[] =
                        flightInfoSegments ??
                        flightActivity?.flightSegments ??
                        (flightInfo ? [flightInfo] : []);

                    const headerFlightNumber = headerSegments.find(
                        (s) => s.flightNumber,
                    )?.flightNumber;

                    // Money: flightInfo owns the destination-level flight cost
                    // / split. When the flight only ever lived on the activity
                    // (no flightInfo money set), fall back to the activity's
                    // cost / budget so the header still shows the fare.
                    const hasFlightInfoMoney =
                        (flightInfo?.cost != null && flightInfo.cost !== '') ||
                        Boolean(flightInfo?.paidBy) ||
                        Boolean(flightInfo?.budgets?.length);
                    const headerCost = hasFlightInfoMoney
                        ? flightInfo?.cost
                        : flightActivity?.cost;
                    const headerBudgets = hasFlightInfoMoney
                        ? flightInfo?.budgets
                        : flightActivity?.budget;

                    // Show the header whenever the unified model carries real
                    // flight data — from flightInfo OR the flight activity.
                    // Keep suppressing a genuinely-empty destination (no
                    // flightInfo data AND no flight activity) so a bare
                    // destination never shows a "Not set / Not set" stub.
                    const showFlightHeader =
                        headerSegments.some(segHasData) ||
                        Boolean(flightActivity);

                    // Resolve the destination's real index in the parent
                    // state. `trips` is `allDestinations.filter(...)`, so each
                    // `trip` is the SAME object reference as in allDestinations
                    // — match by reference (indexOf), which is correct even if
                    // two legs share an id (id-matching returned the FIRST
                    // match, so an activity added to the 2nd same-id leg landed
                    // on the 1st). Fall back to id-match, then the loop index.
                    const realDestIdx = (() => {
                        const byRef = allDestinations.indexOf(trip);
                        if (byRef !== -1) return byRef;
                        const byId = allDestinations.findIndex(
                            (d) => d.id === trip.id,
                        );
                        if (byId !== -1) return byId;
                        return indx;
                    })();
                    return (
                        <Grid
                            key={`trip-${indx}`}
                            item
                            lg={12}
                            md={12}
                            xs={12}
                            className="multrip-content-item"
                        >
                            <Grid container>
                                {sameDayFromCountry && (
                                    <Grid
                                        item
                                        lg={12}
                                        md={12}
                                        xs={12}
                                        className="destination-sameday"
                                    >
                                        <FlightLandIcon className="destination-sameday-icon" />
                                        <span>
                                            Same day — after{' '}
                                            {sameDayFromCountry}
                                        </span>
                                    </Grid>
                                )}
                                <Grid item lg={6} md={6} xs={12} className="content-header">
                                    <span className="country-name">
                                        {country || 'Destination not set'}
                                    </span>
                                    {/* The destination owns the date — shown as
                                        its span here (destination-first), so the
                                        day-block date header above is dropped. */}
                                    {trip.startDate && (
                                        <span className="destination-range">
                                            {trip.endDate &&
                                            !isSameDay(
                                                trip.startDate,
                                                trip.endDate,
                                            )
                                                ? `${formatDate(trip.startDate, 'MMM D')} – ${formatDate(trip.endDate, 'MMM D, YYYY')}`
                                                : formatDate(
                                                      trip.startDate,
                                                      'LL',
                                                  )}
                                        </span>
                                    )}
                                    {/* Single-segment: show the flight number
                                        once here, with the airline icon next
                                        to it — the legs below then skip it to
                                        avoid repeating it 3×. A stopover flight
                                        (multiple segments, different numbers
                                        per leg) shows nothing here and labels
                                        each leg instead. */}
                                    {showFlightHeader &&
                                        headerFlightNumber &&
                                        headerSegments.length <= 1 && (
                                            <span className="flight-no">
                                                <AirlineLogo
                                                    className="flight-no-logo"
                                                    flightNumber={headerFlightNumber}
                                                    label={`Flight ${headerFlightNumber}`}
                                                />
                                                {headerFlightNumber}
                                            </span>
                                        )}
                                </Grid>
                                <Grid
                                    item
                                    lg={6}
                                    md={6}
                                    xs={12}
                                    className="destination-actions"
                                >
                                    {!isViewMode && (
                                        <div className="destination-actions-group">
                                            <span className="destination-action destination-action-edit">
                                                <AddDestinationBtn
                                                    defaultDate={defaultDate}
                                                    tripMaxDate={tripMaxDate}
                                                    isViewMode={isViewMode}
                                                    onChange={(e) => onChangeDestination('edit', e)}
                                                    type="edit"
                                                    buttonType="text"
                                                    data={trip}
                                                />
                                            </span>
                                            <span className="destination-action destination-action-delete">
                                                <DialogBox
                                                    isViewMode={isViewMode}
                                                    title="Delete this destination"
                                                    buttonLabel="Delete"
                                                    buttonType="text"
                                                    onConfirm={() => onChangeDestination('delete', trip.id)}
                                                >
                                                    You are about to delete {country}. Are you sure? This can&rsquo;t be undone.
                                                </DialogBox>
                                            </span>
                                        </div>
                                    )}
                                </Grid>
                                {showFlightHeader && (
                                <Grid item lg={12} md={12} xs={12} className="content-info">
                                    {(() => {
                                        // Render one Depart/Arrive pair per segment so stopovers
                                        // read as discrete legs stacked vertically. Each leg is
                                        // wrapped in its own `.flight-leg-row` so the parent
                                        // container can stack legs as columns without the
                                        // depart/arrive halves wrapping into a tangled grid.
                                        // Unified leg list (flightInfo segments,
                                        // else the flight activity's segments,
                                        // else flightInfo's flat fields) computed
                                        // above as `headerSegments`.
                                        const segs = headerSegments;
                                        if (segs.length === 0) {
                                            return (
                                                <div className="flight-leg-row">
                                                    <div className="flight-leg">
                                                        <FlightTakeoffIcon className="leg-icon" />
                                                        <div className="leg-detail">
                                                            <span className="leg-label">Depart</span>
                                                            <span className="leg-airport">Not set</span>
                                                            <span className="leg-meta">Not set</span>
                                                        </div>
                                                    </div>
                                                    <div className="flight-divider" aria-hidden="true" />
                                                    <div className="flight-leg">
                                                        <FlightLandIcon className="leg-icon" />
                                                        <div className="leg-detail">
                                                            <span className="leg-label">Arrive</span>
                                                            <span className="leg-airport">Not set</span>
                                                            <span className="leg-meta">Not set</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        const blocks: React.ReactNode[] = [];
                                        segs.forEach((seg, idx) => {
                                            if (idx > 0) {
                                                blocks.push(
                                                    <div
                                                        key={`gap-${idx}`}
                                                        className="flight-stopover-gap"
                                                        aria-label="stopover"
                                                    >
                                                        <KeyboardArrowDownRoundedIcon
                                                            fontSize="small"
                                                            aria-hidden="true"
                                                        />
                                                    </div>
                                                );
                                            }
                                            const legLabel =
                                                segs.length > 1
                                                    ? `Depart · Leg ${idx + 1}`
                                                    : 'Depart';
                                            const arriveLabel =
                                                segs.length > 1
                                                    ? `Arrive · Leg ${idx + 1}`
                                                    : 'Arrive';
                                            blocks.push(
                                                <div
                                                    key={`leg-${idx}`}
                                                    className="flight-leg-row"
                                                >
                                                    <div className="flight-leg">
                                                        <FlightTakeoffIcon className="leg-icon" />
                                                        <div className="leg-detail">
                                                            <span className="leg-label">{legLabel}</span>
                                                            {segs.length > 1 &&
                                                                seg.flightNumber && (
                                                                    <span className="leg-carrier">
                                                                        <AirlineLogo
                                                                            className="leg-carrier-logo"
                                                                            flightNumber={seg.flightNumber}
                                                                            label={`Flight ${seg.flightNumber}`}
                                                                        />
                                                                        <span className="leg-carrier-no">
                                                                            {seg.flightNumber}
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            <span className="leg-airport">
                                                                {seg.departAirport || 'Not set'}
                                                            </span>
                                                            <span className="leg-meta">
                                                                {formatLegMeta(seg.departDate, seg.departTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="flight-divider"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="flight-leg">
                                                        <FlightLandIcon className="leg-icon" />
                                                        <div className="leg-detail">
                                                            <span className="leg-label">{arriveLabel}</span>
                                                            <span className="leg-airport">
                                                                {seg.arrivalAirport || 'Not set'}
                                                            </span>
                                                            <span className="leg-meta">
                                                                {formatLegMeta(seg.arrivalDate, seg.arrivalTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                        return <>{blocks}</>;
                                    })()}
                                </Grid>
                                )}
                                {showFlightHeader &&
                                    ((headerCost != null &&
                                    headerCost !== '') ||
                                    flightInfo?.paidBy ||
                                    (headerBudgets &&
                                        headerBudgets.length > 0)) && (
                                    <Grid
                                        item
                                        lg={12}
                                        md={12}
                                        xs={12}
                                        className="content-flight-money"
                                    >
                                        {headerCost != null &&
                                            headerCost !== '' && (
                                                <div className="content-flight-cost">
                                                    <PaymentsOutlinedIcon className="flight-cost-icon" />
                                                    <span className="flight-cost-label">
                                                        Flight cost
                                                    </span>
                                                    <span className="flight-cost-value">
                                                        {convertMoney(headerCost)}
                                                    </span>
                                                </div>
                                            )}
                                        {/* "Paid by" block: when budgets exist, render
                                            the chips inline + edit pencil. When empty,
                                            AddBudget itself renders as the prominent
                                            "Who is paying?" pill. Either way the pencil
                                            stays anchored to the chip group instead of
                                            floating on its own line. The chips READ the
                                            unified model (flightInfo split, else the
                                            flight activity's), but the AddBudget edit
                                            still WRITES to flightInfo — the editable
                                            destination-level source of truth. */}
                                        <div className="content-flight-paidby-wrap">
                                            {headerBudgets &&
                                                headerBudgets.length > 0 && (
                                                    <>
                                                        <span className="flight-paidby-label">
                                                            Paid by
                                                        </span>
                                                        <div className="flight-paidby-chips">
                                                            {headerBudgets.map(
                                                                (entry) => (
                                                                    <span
                                                                        key={entry.id}
                                                                        className="flight-paidby-chip"
                                                                    >
                                                                        <span className="flight-paidby-chip-name">
                                                                            {entry.user.name ??
                                                                                entry.user.label ??
                                                                                'Friend'}
                                                                        </span>
                                                                        <span className="flight-paidby-chip-amount">
                                                                            {convertMoney(
                                                                                entry.budget,
                                                                            )}
                                                                        </span>
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            <AddBudget
                                                isViewMode={isViewMode}
                                                participants={participants}
                                                budget={headerBudgets as BudgetItem[] | undefined}
                                                cost={headerCost}
                                                onSubmit={(entries: BudgetEntry[]) => {
                                                const budgets = entries.map((e, idx) => ({
                                                    // Local-only id keeps React keys
                                                    // stable until the save mutation
                                                    // assigns the backend UUID. Mirrors
                                                    // the placeholder ids used by the
                                                    // activity flow.
                                                    id: Date.now() + idx,
                                                    user: e.user,
                                                    budget: e.budget,
                                                }));
                                                // When the split has exactly one entry,
                                                // auto-derive `paidBy` for the legacy
                                                // single-payer chip readers. Otherwise
                                                // clear paidBy — the split is the
                                                // source of truth for who paid.
                                                const nextPaidBy =
                                                    budgets.length === 1
                                                        ? {
                                                              id:
                                                                  budgets[0].user.userId ??
                                                                  String(
                                                                      budgets[0].user.id,
                                                                  ),
                                                              name:
                                                                  budgets[0].user.name ??
                                                                  budgets[0].user.label ??
                                                                  'Friend',
                                                          }
                                                        : null;
                                                onChangeDestination('edit', {
                                                    ...trip,
                                                    flightInfo: {
                                                        ...(flightInfo ?? {}),
                                                        paidBy: nextPaidBy,
                                                        budgets,
                                                    },
                                                });
                                            }}
                                        />
                                        </div>
                                    </Grid>
                                )}
                                <Grid item lg={12} md={12} xs={12} className="activity-button">
                                    {days.map((day) => (
                                        <div
                                            key={day.date || 'day'}
                                            className="destination-day"
                                        >
                                            {days.length > 1 && (
                                                <div className="destination-day-label">
                                                    {isValidDate(day.date)
                                                        ? formatDate(day.date, 'LL')
                                                        : day.date}
                                                </div>
                                            )}
                                            <Activities
                                                isViewMode={isViewMode}
                                                tripTypeId={TRIP_BASIC.MULTIPLE.id}
                                                activities={day.activities}
                                                destinations={allDestinations}
                                                onChangePlace={(type, e) =>
                                                    onChangePlace(
                                                        type,
                                                        e,
                                                        realDestIdx,
                                                        day.date,
                                                    )
                                                }
                                                participants={participants}
                                                onChangeBudget={(type, e) =>
                                                    onChangeBudget(type, e, realDestIdx)
                                                }
                                                destIdx={realDestIdx}
                                                date={day.date || defaultDate || ''}
                                                country={country ?? ''}
                                                lockActivityStatus={lockActivityStatus}
                                                allowStatusToggle={allowStatusToggle}
                                                allowPaidEdits={allowPaidEdits}
                                                tripStatusName={tripStatusName}
                                                isAutoSaving={isAutoSaving}
                                            />
                                        </div>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })}
        </>
    );
};

export default Multiple;
