import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { useStepperAdvance } from 'components/common/StepperComp';
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
    const { t } = useTranslation();
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const { onAdvance } = useStepperAdvance();
    const selectedId = data?.type?.id;
    const isSingle = selectedId === TRIP_BASIC.SINGLE.id;
    const isMulti = selectedId === TRIP_BASIC.MULTIPLE.id;

    // Only set when the user entered the wizard with a country already pinned
    // (AI search / top-place / country-detail entry). Lets the "plan it for
    // you" card name the destination and hand it to the AI builder.
    const place = data?.destinations?.[0]?.country?.name?.trim() || undefined;

    const pickMode = (
        mode: typeof TRIP_MODE.SINGLE | typeof TRIP_MODE.MULTIPLE
    ) => {
        const next =
            mode === TRIP_MODE.SINGLE ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        dispatch(basicInfo({ type: next }));
        // Picking a mode IS the answer to this one-question step — advance to
        // the next step immediately rather than making the user then hit Next.
        // (The AI card navigates away on its own, so it doesn't go through here.)
        onAdvance();
    };

    // Hand the planning to the Pro AI builder. When we already know the
    // destination, `lockDestination` tells the builder to keep asking for
    // budget/dates but SKIP the "pick a place" step + the options grid, and
    // build that country's itinerary directly. With no known place it's the
    // full wizard. The /discover route gates non-Pro users to /membership.
    const planForMe = () =>
        navigate('/discover', {
            state: place
                ? { countryHint: place, lockDestination: true }
                : undefined,
        });

    return (
        <div className="trip-step-screen trip-mode-step">
            <h2 className="trip-step-headline">
                {t('createTrip.mode.title')}
            </h2>
            <p className="trip-step-sub">{t('createTrip.mode.subtitle')}</p>

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
                        {t('createTrip.mode.single.title')}
                    </span>
                    <span className="trip-mode-card-sub">
                        {t('createTrip.mode.single.subtitle')}
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
                        {t('createTrip.mode.multiple.title')}
                    </span>
                    <span className="trip-mode-card-sub">
                        {t('createTrip.mode.multiple.subtitle')}
                    </span>
                </button>

                <button
                    type="button"
                    className="trip-mode-card trip-mode-card--ai"
                    onClick={planForMe}
                >
                    <AutoAwesomeRoundedIcon className="trip-mode-card-icon" />
                    <span className="trip-mode-card-ai-text">
                        <span className="trip-mode-card-badge">
                            {t('createTrip.mode.ai.badge')}
                        </span>
                        <span className="trip-mode-card-title">
                            {place
                                ? t('createTrip.mode.ai.titleWithPlace', {
                                      place,
                                  })
                                : t('createTrip.mode.ai.title')}
                        </span>
                        <span className="trip-mode-card-sub">
                            {t('createTrip.mode.ai.subtitle')}
                        </span>
                    </span>
                    <ArrowForwardRoundedIcon className="trip-mode-card-arrow" />
                </button>
            </div>
        </div>
    );
};

export default TripModeStep;
