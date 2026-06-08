import classnames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { TRIP_BASIC, TRIP_MODE } from 'constants';
import type { TripState } from 'types';
import './index.scss';

interface TripModeStepProps {
    data: TripState | undefined;
}

/** Step 1 — single vs. multi-destination. One question per screen. The
 *  "Going to <place>" context chip is rendered globally by StepperComp
 *  (TripDestinationChip) so it persists across every step, not just here. */
const TripModeStep = ({ data }: TripModeStepProps) => {
    const dispatch = useTripDispatch();
    const selectedId = data?.type?.id;
    const isSingle = selectedId === TRIP_BASIC.SINGLE.id;
    const isMulti = selectedId === TRIP_BASIC.MULTIPLE.id;

    const pickMode = (
        mode: typeof TRIP_MODE.SINGLE | typeof TRIP_MODE.MULTIPLE
    ) => {
        const next =
            mode === TRIP_MODE.SINGLE ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        dispatch(basicInfo({ type: next }));
    };

    return (
        <div className="trip-step-screen trip-mode-step">
            <h2 className="trip-step-headline">What kind of trip?</h2>
            <p className="trip-step-sub">
                Pick how you're traveling — you can switch later.
            </p>

            <div className="trip-mode-cards">
                <button
                    type="button"
                    className={classnames('trip-mode-card', {
                        'is-selected': isSingle,
                    })}
                    onClick={() => pickMode(TRIP_MODE.SINGLE)}
                >
                    <FlightTakeoffRoundedIcon className="trip-mode-card-icon" />
                    <span className="trip-mode-card-title">
                        One destination
                    </span>
                    <span className="trip-mode-card-sub">
                        One country, one set of dates.
                    </span>
                </button>
                <button
                    type="button"
                    className={classnames('trip-mode-card', {
                        'is-selected': isMulti,
                    })}
                    onClick={() => pickMode(TRIP_MODE.MULTIPLE)}
                >
                    <PublicRoundedIcon className="trip-mode-card-icon" />
                    <span className="trip-mode-card-title">
                        Multiple destinations
                    </span>
                    <span className="trip-mode-card-sub">
                        Hop across countries on one itinerary.
                    </span>
                </button>
            </div>
        </div>
    );
};

export default TripModeStep;
