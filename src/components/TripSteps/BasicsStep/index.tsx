import classnames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchBar from 'components/SearchBar';
import InputField from 'components/common/FormFields/InputField';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { TRIP_BASIC, TRIP_MODE } from 'constants';
import type {
    Country,
    Destination,
    TripChangeEvent,
    TripState,
} from 'types';
import './index.scss';

interface BasicsStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
    /** When true the destination picker stays visible inside this step.
     *  The wizard hides it when the user entered with a country already
     *  preset (AI search / top-place / country-detail entry points), or
     *  when the trip is multi-destination (countries are picked per-day
     *  inside the Itinerary step instead). */
    showDestination: boolean;
}

/**
 * Step 1 of the new 3-step create flow — combines the legacy Trip Type,
 * Destination, Dates and Budget steps into a single screen. Sections are
 * stacked vertically with consistent label/icon treatment, so the user
 * sees the full "tell me about your trip" form at once instead of being
 * trickled four single-field screens.
 */
const BasicsStep = ({ data, onChange, showDestination }: BasicsStepProps) => {
    const dispatch = useTripDispatch();
    const selectedId = data?.type?.id;
    const isSingle = selectedId === TRIP_BASIC.SINGLE.id;
    const isMulti = selectedId === TRIP_BASIC.MULTIPLE.id;
    const rootCountry = data?.destinations?.[0]?.country;
    const start = data?.startDate ?? '';
    const end = data?.endDate ?? '';
    const budget = String(data?.budget ?? '');

    const nights = (() => {
        if (!start || !end) return null;
        const a = new Date(start);
        const b = new Date(end);
        const diff = Math.round(
            (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Number.isFinite(diff) && diff >= 0 ? diff : null;
    })();

    const pickMode = (
        mode: typeof TRIP_MODE.SINGLE | typeof TRIP_MODE.MULTIPLE
    ) => {
        const next =
            mode === TRIP_MODE.SINGLE ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
        dispatch(basicInfo({ type: next }));
    };

    const handleCountryChange = (country: Country) => {
        const destinations = data?.destinations ?? [];
        const next: Destination[] =
            destinations.length > 0
                ? [{ ...destinations[0], country }, ...destinations.slice(1)]
                : [{ id: 0, country, itinerary: [] } as Destination];
        dispatch(basicInfo({ destinations: next }));
    };

    return (
        <div className="trip-basics-step">
            <h2 className="trip-step-headline">Tell us about your trip</h2>
            <p className="trip-step-sub">
                A few quick details — you can tweak everything later.
            </p>

            <section className="trip-basics-section">
                <header className="trip-basics-section-head">
                    <span className="trip-basics-section-num">1</span>
                    <h3 className="trip-basics-section-title">
                        What kind of trip?
                    </h3>
                </header>
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
                            Single destination
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
                            Multi destination
                        </span>
                        <span className="trip-mode-card-sub">
                            Hop across countries on one itinerary.
                        </span>
                    </button>
                </div>
            </section>

            {showDestination && (
                <section className="trip-basics-section">
                    <header className="trip-basics-section-head">
                        <span className="trip-basics-section-num">2</span>
                        <h3 className="trip-basics-section-title">
                            Where are you going?
                        </h3>
                    </header>
                    <div className="trip-basics-field">
                        <label className="trip-basics-label">
                            <PlaceOutlinedIcon /> Destination
                        </label>
                        <SearchBar
                            defaultValue={
                                rootCountry?.name ? rootCountry : null
                            }
                            type="simple"
                            onSelected={handleCountryChange}
                        />
                    </div>
                </section>
            )}

            <section className="trip-basics-section">
                <header className="trip-basics-section-head">
                    <span className="trip-basics-section-num">
                        {showDestination ? 3 : 2}
                    </span>
                    <h3 className="trip-basics-section-title">
                        When are you going?
                    </h3>
                </header>
                <div className="trip-basics-dates-grid">
                    <div className="trip-basics-field">
                        <label className="trip-basics-label">
                            <EventOutlinedIcon /> Starts
                        </label>
                        <InputField
                            value={start}
                            name="startDate"
                            type="date"
                            onChange={(e) => onChange('startDate', e)}
                        />
                    </div>
                    <div className="trip-basics-field">
                        <label className="trip-basics-label">
                            <EventOutlinedIcon /> Ends
                        </label>
                        <InputField
                            value={end}
                            name="endDate"
                            type="date"
                            onChange={(e) => onChange('endDate', e)}
                        />
                    </div>
                </div>
                {nights !== null && (
                    <p className="trip-basics-summary">
                        {nights === 0
                            ? 'Day trip.'
                            : `${nights} night${nights === 1 ? '' : 's'} on the road.`}
                    </p>
                )}
            </section>

            <section className="trip-basics-section">
                <header className="trip-basics-section-head">
                    <span className="trip-basics-section-num">
                        {showDestination ? 4 : 3}
                    </span>
                    <h3 className="trip-basics-section-title">
                        What's your budget?
                    </h3>
                </header>
                <div className="trip-basics-field trip-basics-budget-field">
                    <label className="trip-basics-label">
                        <PaymentsOutlinedIcon /> Total budget
                    </label>
                    <InputField
                        defaultValue={budget}
                        name="budget"
                        placeholder="e.g. 2000"
                        onChange={(e) => onChange('budget', e)}
                    />
                    <p className="trip-basics-hint">
                        Ballpark is fine — split per activity later. Leave blank
                        if you're flexible.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default BasicsStep;
