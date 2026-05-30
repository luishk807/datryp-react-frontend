import { useCallback } from 'react';
import classnames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchBar from 'components/SearchBar';
import InputField from 'components/common/FormFields/InputField';
import BudgetSuggestionBadge from 'components/BudgetSuggestionBadge';
import {
    addPlace,
    basicInfo,
    editPlace,
    movePlace,
    useTripDispatch,
} from 'context/TripContext';
import { useBudgetSuggestion } from 'hooks/useBudgetSuggestion';
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
    const { user, isLoading: isUserLoading } = useUser();
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

    // Pull the seeded "Flight to <city>" / "Train to <city>" activity
    // name when we have one — that's where CityDetail entry stashes
    // the city. Lets us show "Going to Paris, France" instead of just
    // "Going to France" when the trip was started from a city page,
    // and lets the AI budget request anchor to that city for more
    // realistic pricing.
    const inferredCity = (() => {
        const firstDayActivities =
            data?.destinations?.[0]?.itinerary?.[0]?.activities ?? [];
        for (const a of firstDayActivities) {
            const m =
                typeof a.name === 'string'
                    ? /^(?:Flight|Train) to (.+)$/.exec(a.name)
                    : null;
            if (m && m[1]) return m[1];
        }
        return null;
    })();

    const destinationLabel = (() => {
        if (!rootCountry?.name) return null;
        if (inferredCity) return `${inferredCity}, ${rootCountry.name}`;
        return rootCountry.name;
    })();

    // Auto-fill on the wizard — the field starts blank, and the hook
    // dispatches the AI's suggestedTotal back through onChange only
    // when the user hasn't typed their own value. See useBudgetSuggestion
    // for the user-edited guard.
    const handleAutoFill = useCallback(
        (total: number) => {
            onChange('budget', { target: { value: String(total) } });
        },
        [onChange],
    );

    const { suggestion, isLoading: isLoadingSuggestion, inputMatchesAi } =
        useBudgetSuggestion({
            countryCode,
            city: inferredCity,
            days: suggestableDays,
            startDate: start,
            travelStyle: user?.travelerStyles?.[0] ?? null,
            homeCountryCode: user?.homeCountryCode ?? null,
            homeCity: user?.homeCity ?? null,
            enabled: !isUserLoading,
            currentBudget: budget,
            autoFill: true,
            onAutoFill: handleAutoFill,
        });

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
     * End-date pick on a single-destination trip relocates the seeded
     * return leg to the new last day. The outbound + return (FLIGHT or
     * TRAIN) were both seeded on day-1 by CityDetail / CountryDetail so
     * a same-day default trip ships with the round trip visible; once
     * the user picks a real multi-day end date here we MOVE the return
     * to the new end-date so it always sits on the last day block. If
     * no return is found (rare — user manually deleted it), we add a
     * fresh one. Same-day end-date pick is a no-op for the return move
     * (it's already on the only day).
     */
    const handleEndDateChange = (e: TripChangeEvent) => {
        // Apply the date change first so the reducer's orphan-day
        // reanchor pass runs against the OLD itinerary layout —
        // otherwise our just-moved return could be re-parked onto
        // startDate by that same pass.
        onChange('endDate', e);

        const newEndDate =
            typeof e.target.value === 'string' ? e.target.value : '';
        const startDate = data?.startDate;
        if (!newEndDate || !startDate) return;
        // Backwards range (mid-edit / typo) → bail out.
        if (newEndDate < startDate) return;

        const dest = data?.destinations?.[0];
        const itinerary = dest?.itinerary;
        if (!itinerary?.length) return;

        // Find the outbound activity (first FLIGHT/TRAIN on day 1).
        const day1 = itinerary[0];
        const outbound = day1?.activities?.find(
            (a) =>
                a.kind === ACTIVITY_KIND.FLIGHT ||
                a.kind === ACTIVITY_KIND.TRAIN,
        );
        if (!outbound) return;

        // Pull outbound depart/arrival endpoints — needed both to
        // build a fresh return (if missing) and to match the existing
        // return via endpoint-swap.
        let outDepart: string | undefined;
        let outArrival: string | undefined;
        if (outbound.kind === ACTIVITY_KIND.FLIGHT) {
            const seg = outbound.flightSegments?.[0];
            outDepart = seg?.departAirport;
            outArrival = seg?.arrivalAirport;
        } else {
            const seg = outbound.transitSegments?.[0];
            outDepart = seg?.departStation;
            outArrival = seg?.arrivalStation;
        }
        if (!outDepart || !outArrival) return;

        // Locate the existing return — same kind, endpoints swapped.
        // Excludes day-1's outbound row by id so a same-day default
        // doesn't mis-target the outbound when both legs share day 1.
        let existingReturn:
            | { dayIdx: number; activity: Activity }
            | null = null;
        for (let i = 0; i < itinerary.length; i++) {
            const day = itinerary[i];
            for (const a of day.activities ?? []) {
                if (a.id === outbound.id) continue;
                if (a.kind !== outbound.kind) continue;
                if (a.kind === ACTIVITY_KIND.FLIGHT) {
                    const seg = a.flightSegments?.[0];
                    if (
                        seg?.departAirport === outArrival &&
                        seg?.arrivalAirport === outDepart
                    ) {
                        existingReturn = { dayIdx: i, activity: a };
                        break;
                    }
                } else {
                    const seg = a.transitSegments?.[0];
                    if (
                        seg?.departStation === outArrival &&
                        seg?.arrivalStation === outDepart
                    ) {
                        existingReturn = { dayIdx: i, activity: a };
                        break;
                    }
                }
            }
            if (existingReturn) break;
        }

        if (existingReturn) {
            const { activity } = existingReturn;
            // Update the return's internal segment dates to the new
            // end date so the depart/arrival columns on its card
            // match the day it lives on. editPlace targets by `id`,
            // which the reducer assigned to every seeded activity.
            if (activity.kind === ACTIVITY_KIND.FLIGHT) {
                const seg = activity.flightSegments?.[0];
                if (seg) {
                    dispatch(
                        editPlace({
                            value: {
                                id: activity.id,
                                flightSegments: [
                                    {
                                        ...seg,
                                        departDate: newEndDate,
                                        arrivalDate: newEndDate,
                                    },
                                ],
                            },
                            itineraryIndex: 0,
                            activityIndex: 0,
                        }),
                    );
                }
            } else {
                const seg = activity.transitSegments?.[0];
                if (seg) {
                    dispatch(
                        editPlace({
                            value: {
                                id: activity.id,
                                transitSegments: [
                                    {
                                        ...seg,
                                        departDate: newEndDate,
                                        arrivalDate: newEndDate,
                                    },
                                ],
                            },
                            itineraryIndex: 0,
                            activityIndex: 0,
                        }),
                    );
                }
            }
            // Relocate to the new last day. movePlace is a no-op when
            // the activity is already on a day matching newEndDate.
            dispatch(
                movePlace({
                    activityId: activity.id,
                    fromDestIndx: 0,
                    toDestIndx: 0,
                    toDate: newEndDate,
                }),
            );
            return;
        }

        // No existing return (user deleted it manually) — add a fresh
        // one on the new end date.
        const returnActivity: Omit<Activity, 'id'> =
            outbound.kind === ACTIVITY_KIND.FLIGHT
                ? {
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
                  }
                : {
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

            {!showDestination && destinationLabel && (
                <div
                    className="trip-basics-destination-chip"
                    aria-label="Trip destination"
                >
                    <PlaceOutlinedIcon
                        className="trip-basics-destination-chip-icon"
                        fontSize="small"
                    />
                    <span className="trip-basics-destination-chip-label">
                        Going to
                    </span>
                    <span className="trip-basics-destination-chip-value">
                        {destinationLabel}
                    </span>
                </div>
            )}

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
                    <BudgetSuggestionBadge
                        suggestion={suggestion}
                        isLoading={isLoadingSuggestion}
                        destinationLabel={destinationLabel}
                        inputMatchesAi={inputMatchesAi}
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
