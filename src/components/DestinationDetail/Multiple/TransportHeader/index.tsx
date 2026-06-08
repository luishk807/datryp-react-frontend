import classNames from 'classnames';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import TrainRoundedIcon from '@mui/icons-material/TrainRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import './index.scss';
import { ACTIVITY_KIND } from 'constants';
import AddBudget from 'components/DestinationDetail/AddBudget';
import AirlineLogo from 'components/common/AirlineLogo';
import { convertMoney } from 'utils';
import type {
    ActivityKind,
    BudgetEntry,
    BudgetItem,
    Friend,
} from 'types';

/** One normalized leg of the destination's arrival transport, mode-agnostic.
 *  Flight legs carry `flightNumber` (drives the per-leg airline logo);
 *  transit legs leave it undefined and rely on the mode icon + headline. */
export interface TransportLeg {
    departPlace: string;
    departMeta: string;
    arrivalPlace: string;
    arrivalMeta: string;
    /** Flight only — the per-leg flight number for the stopover carrier row. */
    flightNumber?: string;
}

export interface TransportHeaderProps {
    /** Drives the depart/arrive icons (and whether AirlineLogo shows). */
    mode: ActivityKind;
    legs: TransportLeg[];
    costLabel: string;
    cost?: string | number;
    budgets?: BudgetItem[];
    participants?: Friend[];
    isViewMode?: boolean;
    /** When provided, the paid-by block is editable via AddBudget (flight
     *  path). When omitted, the cost + paid-by chips render READ-ONLY —
     *  used for ground transit, whose budget edit lives on the activity. */
    onBudgetSubmit?: (entries: BudgetEntry[]) => void;
}

const TAKEOFF_ICON: Record<string, SvgIconComponent> = {
    [ACTIVITY_KIND.TRAIN]: TrainRoundedIcon,
    [ACTIVITY_KIND.BUS]: DirectionsBusRoundedIcon,
    [ACTIVITY_KIND.RENTAL_CAR]: DirectionsCarRoundedIcon,
};

/** Depart-side icon: flights use a takeoff glyph; ground modes use their own
 *  mode icon (and reuse the SAME icon on the arrive side). */
const departIcon = (mode: ActivityKind): SvgIconComponent =>
    mode === ACTIVITY_KIND.FLIGHT ? FlightTakeoffIcon : TAKEOFF_ICON[mode];

const arriveIcon = (mode: ActivityKind): SvgIconComponent =>
    mode === ACTIVITY_KIND.FLIGHT ? FlightLandIcon : TAKEOFF_ICON[mode];

const TransportHeader = ({
    mode,
    legs,
    costLabel,
    cost,
    budgets,
    participants = [],
    isViewMode = false,
    onBudgetSubmit,
}: TransportHeaderProps) => {
    const isFlight = mode === ACTIVITY_KIND.FLIGHT;
    const DepartIcon = departIcon(mode);
    const ArriveIcon = arriveIcon(mode);
    const multiLeg = legs.length > 1;

    const hasMoney =
        (cost != null && cost !== '') ||
        Boolean(budgets && budgets.length > 0);
    const showPaidBy =
        (budgets && budgets.length > 0) || (!isViewMode && Boolean(onBudgetSubmit));

    return (
        <>
            <Grid item lg={12} md={12} xs={12} className="content-info">
                {legs.map((leg, idx) => (
                    <div key={`leg-${idx}`}>
                        {idx > 0 && (
                            <div
                                className="flight-stopover-gap"
                                aria-label="stopover"
                            >
                                <KeyboardArrowDownRoundedIcon
                                    fontSize="small"
                                    aria-hidden="true"
                                />
                            </div>
                        )}
                        <div className="flight-leg-row">
                            <div className="flight-leg">
                                <DepartIcon className="leg-icon" />
                                <div className="leg-detail">
                                    <span className="leg-label">
                                        {multiLeg
                                            ? `Depart · Leg ${idx + 1}`
                                            : 'Depart'}
                                    </span>
                                    {isFlight &&
                                        multiLeg &&
                                        leg.flightNumber && (
                                            <span className="leg-carrier">
                                                <AirlineLogo
                                                    className="leg-carrier-logo"
                                                    flightNumber={leg.flightNumber}
                                                    label={`Flight ${leg.flightNumber}`}
                                                />
                                                <span className="leg-carrier-no">
                                                    {leg.flightNumber}
                                                </span>
                                            </span>
                                        )}
                                    <span className="leg-airport">
                                        {leg.departPlace || 'Not set'}
                                    </span>
                                    <span className="leg-meta">
                                        {leg.departMeta}
                                    </span>
                                </div>
                            </div>
                            <div
                                className="flight-divider"
                                aria-hidden="true"
                            />
                            <div className="flight-leg">
                                <ArriveIcon className="leg-icon" />
                                <div className="leg-detail">
                                    <span className="leg-label">
                                        {multiLeg
                                            ? `Arrive · Leg ${idx + 1}`
                                            : 'Arrive'}
                                    </span>
                                    <span className="leg-airport">
                                        {leg.arrivalPlace || 'Not set'}
                                    </span>
                                    <span className="leg-meta">
                                        {leg.arrivalMeta}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </Grid>
            {hasMoney && (
                <Grid
                    item
                    lg={12}
                    md={12}
                    xs={12}
                    className="content-flight-money"
                >
                    {cost != null && cost !== '' && (
                        <div className="content-flight-cost">
                            <PaymentsOutlinedIcon className="flight-cost-icon" />
                            <span className="flight-cost-label">
                                {costLabel}
                            </span>
                            <span className="flight-cost-value">
                                {convertMoney(cost)}
                            </span>
                        </div>
                    )}
                    {showPaidBy && (
                        <div
                            className={classNames('content-flight-paidby-wrap', {
                                'content-flight-paidby-readonly': !onBudgetSubmit,
                            })}
                        >
                            {budgets && budgets.length > 0 && (
                                <>
                                    <span className="flight-paidby-label">
                                        Paid by
                                    </span>
                                    <div className="flight-paidby-chips">
                                        {budgets.map((entry) => (
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
                                                    {convertMoney(entry.budget)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                            {onBudgetSubmit && (
                                <AddBudget
                                    isViewMode={isViewMode}
                                    participants={participants}
                                    budget={budgets}
                                    cost={cost}
                                    onSubmit={onBudgetSubmit}
                                />
                            )}
                        </div>
                    )}
                </Grid>
            )}
        </>
    );
};

export default TransportHeader;
