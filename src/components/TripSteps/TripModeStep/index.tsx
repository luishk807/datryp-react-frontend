import classnames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { useStepperAdvance } from 'components/common/StepperComp';
import { TRIP_BASIC, TRIP_MODE } from 'constants';
import type { TripState } from 'types';
import './index.scss';

interface TripModeStepProps {
    data: TripState | undefined;
}

const TripModeStep = ({ data }: TripModeStepProps) => {
    const dispatch = useTripDispatch();
    const { onAdvance } = useStepperAdvance();
    const selectedId = data?.type?.id;
    const isSingle = selectedId === TRIP_BASIC.SINGLE.id;
    const isMulti = selectedId === TRIP_BASIC.MULTIPLE.id;

    const pick = (mode: typeof TRIP_MODE.SINGLE | typeof TRIP_MODE.MULTIPLE) => {
        const next =
            mode === TRIP_MODE.SINGLE ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        dispatch(basicInfo({ type: next }));
        // Auto-advance on every click — even if the user is re-confirming
        // the mode they already had selected (e.g. the wizard seeded SINGLE
        // from the URL and the user clicks Single to proceed).
        onAdvance();
    };

    return (
        <div className="trip-mode-step">
            <h2 className="trip-step-headline">What kind of trip is this?</h2>
            <p className="trip-step-sub">
                Pick one — you can still tweak the rest later.
            </p>

            <div className="trip-mode-cards">
                <button
                    type="button"
                    className={classnames('trip-mode-card', { 'is-selected': isSingle })}
                    onClick={() => pick(TRIP_MODE.SINGLE)}
                >
                    <FlightTakeoffRoundedIcon className="trip-mode-card-icon" />
                    <span className="trip-mode-card-title">Single destination</span>
                    <span className="trip-mode-card-sub">
                        One country, one set of dates, easy.
                    </span>
                </button>
                <button
                    type="button"
                    className={classnames('trip-mode-card', { 'is-selected': isMulti })}
                    onClick={() => pick(TRIP_MODE.MULTIPLE)}
                >
                    <PublicRoundedIcon className="trip-mode-card-icon" />
                    <span className="trip-mode-card-title">Multi destination</span>
                    <span className="trip-mode-card-sub">
                        Hop across countries on a single itinerary.
                    </span>
                </button>
            </div>
        </div>
    );
};

export default TripModeStep;
