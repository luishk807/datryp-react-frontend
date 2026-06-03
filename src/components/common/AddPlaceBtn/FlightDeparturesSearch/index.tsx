import { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import WbTwilightRoundedIcon from '@mui/icons-material/WbTwilightRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import classNames from 'classnames';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import WizardNav from 'components/common/AddPlaceBtn/steps/WizardNav';
import { useFlightDepartures } from 'api/hooks/useFlightDepartures';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import FlightDepartureRow from './FlightDepartureRow';
import './index.scss';

/** Time-of-day windows. Each maps to a `from_time` the backend turns into
 *  a ≤12h departures window — one window per provider call keeps us inside
 *  the rate limit while still covering the part of the day the user cares
 *  about. */
const TIME_WINDOWS = [
    { key: 'morning', label: 'Morning', fromTime: '00:00', Icon: WbTwilightRoundedIcon },
    { key: 'afternoon', label: 'Afternoon', fromTime: '12:00', Icon: WbSunnyRoundedIcon },
    { key: 'evening', label: 'Evening', fromTime: '18:00', Icon: NightsStayRoundedIcon },
] as const;

type TimeWindowKey = (typeof TIME_WINDOWS)[number]['key'];

/** Render the result list in pages so a busy hub (the backend caps a
 *  search at 250) never mounts hundreds of DOM rows at once. Purely
 *  client-side over the already-fetched list — paging costs no extra
 *  provider calls. */
const PAGE_SIZE = 20;

export interface FlightDeparturesSearchProps {
    /** Seed the From-airport — defaults to the user's home-base IATA. */
    initialAirport?: string;
    /** Seed the To-airport — defaults to the trip destination's airport. */
    initialArrival?: string;
    /** Seed the date (YYYY-MM-DD) — the activity day. */
    initialDate?: string;
    onPick: (item: FlightDepartureOption) => void;
    /** Wizard "Back" action. Rendered in this component's footer row next
     *  to Search so the two actions share one row (the parent no longer
     *  renders a separate WizardNav for the flight-search branch). */
    onBack: () => void;
}

const FlightDeparturesSearch = ({
    initialAirport = '',
    initialArrival = '',
    initialDate = '',
    onPick,
    onBack,
}: FlightDeparturesSearchProps) => {
    const [airport, setAirport] = useState(initialAirport);
    const [arrival, setArrival] = useState(initialArrival);
    const [date, setDate] = useState(initialDate);
    const [windowKey, setWindowKey] = useState<TimeWindowKey>('morning');
    const [airline, setAirline] = useState('');
    // Client-side text filter over the returned list — a busy hub returns
    // a long window, so let the user narrow by flight number / airport /
    // city / airline name without burning another provider call.
    const [filter, setFilter] = useState('');
    // Explicit-search gate: the provider is rate-limited, so the query only
    // fires when this flips true on the Search tap. We bump it on each
    // search so re-tapping after editing inputs re-enables the query.
    const [searched, setSearched] = useState(false);

    const fromTime =
        TIME_WINDOWS.find((w) => w.key === windowKey)?.fromTime ?? '00:00';

    const { data, isFetching, isError } = useFlightDepartures(
        airport,
        date,
        fromTime,
        airline,
        searched,
        arrival,
    );

    // Swap the From / To airports in place. Re-gates the search so the
    // user taps Search again with the reversed route (e.g. flip an
    // outbound EWR→PTY to the return PTY→EWR).
    const handleSwap = () => {
        setAirport(arrival);
        setArrival(airport);
        setSearched(false);
    };

    const items = data ?? [];
    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) =>
            [
                item.flightNumber,
                item.arrivalAirport,
                item.arrivalAirportName,
                item.airline,
            ]
                .filter(Boolean)
                .some((field) => field!.toLowerCase().includes(q)),
        );
    }, [items, filter]);

    // How many of the filtered rows are currently rendered. Resets to the
    // first page whenever the result set changes (new search or a changed
    // filter) so the user always starts at the top.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [filtered]);
    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    const canSearch = /^[A-Za-z]{3}$/.test(airport.trim()) && Boolean(date);
    const showResults = searched && !isFetching;

    return (
        <div className="flight-departures-search">
            {/* From / swap / To — stacked on mobile, a single row on
                desktop (≥768px). The swap flips the route (outbound ⇄
                return) without retyping both codes. Date renders on its
                own row BELOW the airports. */}
            <div className="flight-departures-search-od">
                <div className="flight-departures-search-field flight-departures-search-airport">
                    <span className="flight-departures-search-label">
                        From airport
                    </span>
                    <AirportAutocomplete
                        value={airport}
                        onChange={(code) => {
                            setAirport(code);
                            setSearched(false);
                        }}
                        placeholder="IATA code, city, or airport"
                    />
                </div>
                <button
                    type="button"
                    className="flight-departures-search-swap"
                    onClick={handleSwap}
                    aria-label="Swap From and To airports"
                    title="Swap airports"
                >
                    {/* Vertical arrows when the fields stack (mobile),
                        horizontal when they sit side-by-side (desktop). */}
                    <SwapVertRoundedIcon
                        className="flight-departures-search-swap-vert"
                        fontSize="small"
                    />
                    <SwapHorizRoundedIcon
                        className="flight-departures-search-swap-horiz"
                        fontSize="small"
                    />
                </button>
                <div className="flight-departures-search-field flight-departures-search-airport">
                    <span className="flight-departures-search-label">
                        To airport
                    </span>
                    <AirportAutocomplete
                        value={arrival}
                        onChange={(code) => {
                            setArrival(code);
                            setSearched(false);
                        }}
                        placeholder="IATA code, city, or airport"
                    />
                </div>
            </div>
            <div className="flight-departures-search-field flight-departures-search-date">
                <span className="flight-departures-search-label">Date</span>
                <InputField
                    value={date}
                    name="flight-departures-date"
                    type="date"
                    label={null}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setSearched(false);
                    }}
                />
            </div>

            <div className="flight-departures-search-window">
                <span className="flight-departures-search-label">
                    Time of day
                </span>
                {/* Reuses the shared sliding-thumb segmented control (the
                    same one the Ground transport form uses for Train /
                    Bus / Rental car) so the toggle reads consistently
                    across the wizard. `is-pos-N` slides the thumb to the
                    active third. */}
                <div
                    className={classNames('hotel-side-toggle', 'is-three', {
                        'is-pos-2': windowKey === 'afternoon',
                        'is-pos-3': windowKey === 'evening',
                    })}
                    role="tablist"
                    aria-label="Time of day"
                >
                    <span className="hotel-side-thumb" aria-hidden="true" />
                    {TIME_WINDOWS.map((w) => {
                        const active = windowKey === w.key;
                        const Icon = w.Icon;
                        return (
                            <button
                                key={w.key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={classNames('hotel-side-btn', {
                                    selected: active,
                                })}
                                onClick={() => {
                                    setWindowKey(w.key);
                                    setSearched(false);
                                }}
                            >
                                <Icon
                                    className="hotel-side-icon"
                                    fontSize="small"
                                />
                                <span>{w.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flight-departures-search-field flight-departures-search-airline">
                <span className="flight-departures-search-label">
                    Airline code (optional)
                </span>
                <InputField
                    value={airline}
                    label={null}
                    placeholder="e.g. UA"
                    required={false}
                    onChange={(e) => {
                        setAirline(e.target.value);
                        setSearched(false);
                    }}
                />
            </div>

            {isFetching && (
                <div className="flight-departures-search-status">
                    <CircularProgress size={18} />
                    <span>Searching departures…</span>
                </div>
            )}

            {showResults && (isError || filtered.length === 0) && (
                <div className="flight-departures-search-empty">
                    No flights found — try a different time of day, clear the
                    To-airport or airline filter, or switch to Custom to enter
                    it by hand.
                </div>
            )}

            {showResults && filtered.length > 0 && (
                <>
                    <div className="flight-departures-search-filter">
                        <InputField
                            value={filter}
                            name="flight-departures-filter"
                            label="Filter results"
                            placeholder="Flight #, airport, city, or airline"
                            required={false}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <ul className="flight-departures-search-results" role="list">
                        {visible.map((item, idx) => (
                            <FlightDepartureRow
                                key={`${item.flightNumber ?? 'flight'}-${idx}`}
                                item={item}
                                onPick={onPick}
                            />
                        ))}
                    </ul>
                    {hasMore ? (
                        <button
                            type="button"
                            className="flight-departures-search-more"
                            onClick={() =>
                                setVisibleCount((c) => c + PAGE_SIZE)
                            }
                        >
                            Show more ({filtered.length - visibleCount} left)
                        </button>
                    ) : (
                        filtered.length > PAGE_SIZE && (
                            <p className="flight-departures-search-count">
                                Showing all {filtered.length}
                            </p>
                        )
                    )}
                </>
            )}

            <WizardNav
                onBack={onBack}
                onNext={() => setSearched(true)}
                nextLabel="Search"
                nextDisabled={!canSearch}
            />
        </div>
    );
};

export default FlightDeparturesSearch;
