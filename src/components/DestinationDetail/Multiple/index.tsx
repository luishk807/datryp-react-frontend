import _ from 'lodash';
import { convertMoney, formatDate, isValidDate, reformatDate } from 'utils';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import './index.scss';
import { TRIP_BASIC } from 'constants';
import Activities from 'components/DestinationDetail/Activities';
import AddBudget from 'components/DestinationDetail/AddBudget';
import AddDestinationBtn from 'components/common/AddDestination';
import DialogBox from 'components/common/FormFields/DialogBox';
import type {
    ActionType,
    BudgetEntry,
    BudgetItem,
    Destination,
    Friend,
} from 'types';

const formatLegDate = (value?: string) =>
    value && isValidDate(value) ? formatDate(value, 'MMM D, YYYY') : '';

const formatLegTime = (value?: string) =>
    value && isValidDate(value, 'HH:mm') ? reformatDate(value, 'HH:mm', 'LT') : '';

const formatLegMeta = (date?: string, time?: string) => {
    const parts = [formatLegDate(date), formatLegTime(time)].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Not set';
};

export interface MultipleProps {
    defaultDate?: string;
    tripMaxDate?: string | null;
    trips?: Destination[] | null;
    /** Full destinations array from TripState, unfiltered. Used to compute
     *  each filtered trip's real index in the parent state — the index that
     *  movePlace expects in dnd-kit's drag-end payload. */
    allDestinations?: Destination[];
    onChangeDestination: (type: ActionType, value: unknown) => void;
    onChangeBudget: (type: ActionType, value: unknown, destinationIndx?: number) => void;
    onChangePlace: (type: ActionType, value: unknown, destinationIndx?: number) => void;
    participants?: Friend[];
    isViewMode?: boolean;
    /** Disable the per-activity status pill (new-trip flow only). */
    lockActivityStatus?: boolean;
    /** Forwarded to Activities so post-planning UI can render. */
    tripStatusName?: string;
}

const Multiple = ({
    defaultDate,
    tripMaxDate,
    trips = [],
    allDestinations = [],
    onChangeDestination,
    onChangeBudget,
    onChangePlace,
    participants = [],
    isViewMode = false,
    lockActivityStatus = false,
    tripStatusName,
}: MultipleProps) => {
    return (
        <>
            {(trips ?? []).map((trip, indx) => {
                    const flightInfo = _.get(trip, 'flightInfo');
                    const country = _.get(trip, 'country.name');
                    const activities = _.get(trip, 'itinerary.0.activities');
                    // Resolve the destination's real index in the parent
                    // state — onChangePlace/onChangeBudget already do this
                    // by date, but drag-and-drop needs it eagerly so the
                    // droppable's `data` payload carries the right index.
                    const realDestIdx = (() => {
                        const byId = allDestinations.findIndex((d) => d.id === trip.id);
                        if (byId !== -1) return byId;
                        // Fall back to the filtered-loop index if the
                        // destination has no id yet (early state during the
                        // new-trip flow).
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
                                <Grid item lg={6} md={6} xs={12} className="content-header">
                                    <span className="country-name">
                                        {country || 'Destination not set'}
                                    </span>
                                    {flightInfo?.flightNumber && (
                                        <span className="flight-no">
                                            Flight {flightInfo.flightNumber}
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
                                                    You are about to delete {country}. Are you sure you want to delete this item
                                                </DialogBox>
                                            </span>
                                        </div>
                                    )}
                                </Grid>
                                <Grid item lg={12} md={12} xs={12} className="content-info">
                                    {(() => {
                                        // Render one Depart/Arrive pair per segment so stopovers
                                        // read as discrete legs stacked vertically. Each leg is
                                        // wrapped in its own `.flight-leg-row` so the parent
                                        // container can stack legs as columns without the
                                        // depart/arrive halves wrapping into a tangled grid.
                                        // Fall back to the headline flat fields when no
                                        // `segments` list is present (legacy single-leg
                                        // destinations saved before the table existed).
                                        const segs =
                                            flightInfo?.segments?.length
                                                ? flightInfo.segments
                                                : flightInfo
                                                  ? [flightInfo]
                                                  : [];
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
                                {((flightInfo?.cost != null &&
                                    flightInfo.cost !== '') ||
                                    flightInfo?.paidBy ||
                                    (flightInfo?.budgets &&
                                        flightInfo.budgets.length > 0)) && (
                                    <Grid
                                        item
                                        lg={12}
                                        md={12}
                                        xs={12}
                                        className="content-flight-money"
                                    >
                                        {flightInfo?.cost != null &&
                                            flightInfo.cost !== '' && (
                                                <div className="content-flight-cost">
                                                    <PaymentsOutlinedIcon className="flight-cost-icon" />
                                                    <span className="flight-cost-label">
                                                        Flight cost
                                                    </span>
                                                    <span className="flight-cost-value">
                                                        {convertMoney(flightInfo.cost)}
                                                    </span>
                                                </div>
                                            )}
                                        {/* "Paid by" block: when budgets exist, render
                                            the chips inline + edit pencil. When empty,
                                            AddBudget itself renders as the prominent
                                            "Who is paying?" pill. Either way the pencil
                                            stays anchored to the chip group instead of
                                            floating on its own line. */}
                                        <div className="content-flight-paidby-wrap">
                                            {flightInfo?.budgets &&
                                                flightInfo.budgets.length > 0 && (
                                                    <>
                                                        <span className="flight-paidby-label">
                                                            Paid by
                                                        </span>
                                                        <div className="flight-paidby-chips">
                                                            {flightInfo.budgets.map(
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
                                                budget={flightInfo?.budgets as BudgetItem[] | undefined}
                                                cost={flightInfo?.cost}
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
                                    <Activities
                                        isViewMode={isViewMode}
                                        tripTypeId={TRIP_BASIC.MULTIPLE.id}
                                        activities={activities}
                                        onChangePlace={(type, e) => onChangePlace(type, e, realDestIdx)}
                                        participants={participants}
                                        onChangeBudget={(type, e) => onChangeBudget(type, e, realDestIdx)}
                                        destIdx={realDestIdx}
                                        date={trip.startDate ?? defaultDate ?? ''}
                                        country={country ?? ''}
                                        lockActivityStatus={lockActivityStatus}
                                        tripStatusName={tripStatusName}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    );
                })}
            {!isViewMode && (
                <Grid
                    item
                    lg={12}
                    md={12}
                    xs={12}
                    className="multrip-content add-destination-button"
                >
                    <Grid container>
                        <Grid item>
                            <AddDestinationBtn
                                tripMaxDate={tripMaxDate}
                                isViewMode={isViewMode}
                                defaultDate={defaultDate}
                                onChange={(e) => onChangeDestination('add', e)}
                            />
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </>
    );
};

export default Multiple;
