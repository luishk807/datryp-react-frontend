import { useEffect, useRef } from 'react';
import classnames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SearchBar from 'components/SearchBar';
import InputField from 'components/common/FormFields/InputField';
import { addPlace, basicInfo, useTripDispatch } from 'context/TripContext';
import { useBudgetSuggestion } from 'api/hooks/useBudgetSuggestion';
import { useUser } from 'context/UserContext';
import { ACTIVITY_KIND, TRIP_BASIC, TRIP_MODE } from 'constants';
import type {
    Activity,
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
    const { user } = useUser();
    const budgetSuggestion = useBudgetSuggestion();
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

    // Auto-fill budget via `POST /budgets/suggest`. Fires as soon as
    // we have a country + a valid date range — no button, no extra
    // click. On multi-destination trips we use the first leg's country
    // since the BasicsStep budget is trip-wide (per-leg budgets live
    // later in the wizard).
    const suggestableDays = (() => {
        if (nights === null) return null;
        // `nights` is end - start; trip length in days is nights + 1
        // (a same-day trip is 1 day, not 0). Cap at 90 to match the
        // backend's accepted range.
        const d = nights + 1;
        return d >= 1 && d <= 90 ? d : null;
    })();
    const countryCode = rootCountry?.code ?? null;

    // Tracks the most recent AI total so we (a) avoid refetching the
    // same (country, days, start_date, style) combo and (b) know when
    // the input still holds the AI value vs the user has edited it
    // (drives the "AI suggested budget" badge under the field).
    const lastAiTotalRef = useRef<number | null>(null);
    const lastRequestKeyRef = useRef<string | null>(null);
    const budgetSuggestionMutate = budgetSuggestion.mutate;

    useEffect(() => {
        if (!countryCode || suggestableDays === null || !start) return;
        const styleHint = user?.travelerStyles?.[0] ?? null;
        // Include `start` in the key so a date shift that keeps the
        // same trip length (e.g. moving the whole window by a week
        // into a different season) still triggers a fresh estimate —
        // pricing in July vs January for the same destination can be
        // very different.
        const requestKey = `${countryCode}|${suggestableDays}|${start}|${styleHint ?? ''}`;
        if (lastRequestKeyRef.current === requestKey) return;
        // If the user has typed their own value (input differs from
        // the last AI total), don't override it on a context change —
        // they took ownership. Clearing the field opts back in.
        const currentBudgetStr = String(data?.budget ?? '').trim();
        const lastAiStr = String(lastAiTotalRef.current ?? '');
        const userEdited =
            currentBudgetStr !== '' &&
            currentBudgetStr !== '0' &&
            currentBudgetStr !== lastAiStr;
        if (userEdited) return;
        lastRequestKeyRef.current = requestKey;
        budgetSuggestionMutate(
            {
                countryCode,
                days: suggestableDays,
                travelStyle: styleHint,
                startDate: start,
            },
            {
                onSuccess: (result) => {
                    if (result?.suggestedTotal != null) {
                        lastAiTotalRef.current = result.suggestedTotal;
                        onChange('budget', {
                            target: {
                                value: String(result.suggestedTotal),
                            },
                        });
                    }
                },
            }
        );
    }, [
        countryCode,
        suggestableDays,
        start,
        user?.travelerStyles,
        data?.budget,
        budgetSuggestionMutate,
        onChange,
    ]);

    const suggestion = budgetSuggestion.data;
    const isLoadingSuggestion = budgetSuggestion.isPending;
    // Badge only shows when the field still matches the AI value —
    // typing over it hides the badge automatically.
    const showAiBadge =
        suggestion?.suggestedTotal != null &&
        budget === String(suggestion.suggestedTotal);
    const aiNote = showAiBadge ? suggestion?.note ?? null : null;

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

    /**
     * End-date pick on a single-destination trip auto-seeds a "return
     * leg" on the last day. The outbound (FLIGHT or TRAIN) was already
     * seeded by CityDetail / CountryDetail on day 1 — we mirror it
     * here with depart/arrival swapped and the date set to the
     * just-picked end date, so the user lands in the People step with
     * BOTH legs of their trip pre-populated.
     *
     * Idempotent: skipped if a return-shaped activity already exists
     * anywhere in the itinerary. Skipped on same-day trips (no return
     * needed). Doesn't auto-relocate the return when the user later
     * shifts the end date — drag-and-drop in DestinationDetail covers
     * that case.
     */
    const handleEndDateChange = (e: TripChangeEvent) => {
        // Apply the date change first so the reducer's orphan-day
        // reanchor pass runs against the OLD itinerary layout —
        // otherwise our just-added return could be re-parked onto
        // startDate by that same pass.
        onChange('endDate', e);

        const newEndDate =
            typeof e.target.value === 'string' ? e.target.value : '';
        const startDate = data?.startDate;
        if (!newEndDate || !startDate) return;
        // Backwards range (mid-edit / typo) → bail out. Same-day is
        // OK: a one-day trip can still have a "fly there in the
        // morning, fly back at night" pair.
        if (newEndDate < startDate) return;

        const dest = data?.destinations?.[0];
        const itinerary = dest?.itinerary;
        if (!itinerary?.length) return;

        const day1 = itinerary[0];
        const outbound = day1?.activities?.find(
            (a) =>
                a.kind === ACTIVITY_KIND.FLIGHT ||
                a.kind === ACTIVITY_KIND.TRAIN,
        );
        if (!outbound) return;

        // Pull the depart/arrival endpoints + build the mirror in a
        // single kind-narrowed branch so TS keeps FlightInfo /
        // TransitInfo straight (no `FlightInfo | TransitInfo` union
        // gymnastics).
        let outDepart: string | undefined;
        let outArrival: string | undefined;
        let returnActivity: Omit<Activity, 'id'> | null = null;
        if (outbound.kind === ACTIVITY_KIND.FLIGHT) {
            const seg = outbound.flightSegments?.[0];
            outDepart = seg?.departAirport;
            outArrival = seg?.arrivalAirport;
            if (!outDepart || !outArrival) return;
            returnActivity = {
                kind: ACTIVITY_KIND.FLIGHT,
                name: `Flight back to ${outDepart}`,
                flightSegments: [
                    {
                        departAirport: outArrival,
                        arrivalAirport: outDepart,
                        departDate: newEndDate,
                        departTime: '00:00',
                        arrivalDate: newEndDate,
                        arrivalTime: '00:00',
                    },
                ],
            };
        } else {
            const seg = outbound.transitSegments?.[0];
            outDepart = seg?.departStation;
            outArrival = seg?.arrivalStation;
            if (!outDepart || !outArrival) return;
            returnActivity = {
                kind: ACTIVITY_KIND.TRAIN,
                name: `Train back to ${outDepart}`,
                transitSegments: [
                    {
                        departStation: outArrival,
                        arrivalStation: outDepart,
                        departDate: newEndDate,
                        departTime: '00:00',
                        arrivalDate: newEndDate,
                        arrivalTime: '00:00',
                    },
                ],
            };
        }

        // Idempotency: skip if a return-shaped activity (same kind,
        // endpoints swapped) already exists anywhere in the itinerary.
        // Same kind-narrowed branch pattern as above so TS keeps the
        // segment field names straight per kind.
        const alreadyHasReturn = itinerary.some((day) =>
            day.activities.some((a) => {
                if (a.kind !== outbound.kind) return false;
                if (outbound.kind === ACTIVITY_KIND.FLIGHT) {
                    const seg = a.flightSegments?.[0];
                    return (
                        seg?.departAirport === outArrival &&
                        seg?.arrivalAirport === outDepart
                    );
                }
                const seg = a.transitSegments?.[0];
                return (
                    seg?.departStation === outArrival &&
                    seg?.arrivalStation === outDepart
                );
            }),
        );
        if (alreadyHasReturn) return;

        dispatch(
            addPlace({ date: newEndDate, value: returnActivity, index: 0 }),
        );
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
                <section
                    className="trip-basics-section"
                    data-tour="trip-destination"
                >
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

            <section
                className="trip-basics-section"
                data-tour="trip-dates"
            >
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
                            onChange={handleEndDateChange}
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

            <section
                className="trip-basics-section"
                data-tour="trip-budget"
            >
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
                        value={budget}
                        name="budget"
                        placeholder={
                            isLoadingSuggestion
                                ? 'Asking datryp for an estimate…'
                                : 'e.g. 2000'
                        }
                        onChange={(e) => onChange('budget', e)}
                    />
                    {isLoadingSuggestion && (
                        <p className="trip-basics-budget-ai-badge is-loading">
                            <AutoAwesomeRoundedIcon
                                className="trip-basics-budget-ai-badge-icon"
                                fontSize="small"
                            />
                            <span>
                                Updating AI estimate
                                {rootCountry?.name
                                    ? ` for ${rootCountry.name}`
                                    : ''}
                                …
                            </span>
                        </p>
                    )}
                    {!isLoadingSuggestion && showAiBadge && (
                        <p className="trip-basics-budget-ai-badge">
                            <AutoAwesomeRoundedIcon
                                className="trip-basics-budget-ai-badge-icon"
                                fontSize="small"
                            />
                            <span>
                                AI suggested budget
                                {rootCountry?.name
                                    ? ` for ${rootCountry.name}`
                                    : ''}
                                {aiNote ? ` — ${aiNote}` : ''}
                            </span>
                        </p>
                    )}
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
