import {
    useEffect,
    useMemo,
    useRef,
    type Dispatch,
    type SetStateAction,
} from 'react';
import FlightSegmentLookupWatcher from 'components/common/AddPlaceBtn/FlightSegmentLookupWatcher';
import TransitSegmentLookupWatcher from 'components/common/AddPlaceBtn/TransitSegmentLookupWatcher';
import { useAirports } from 'api/hooks/useAirports';
import { useCountries } from 'api/hooks/useCountries';
import { useDestinationAirport } from 'api/hooks/useDestinationAirport';
import { parseRouteStops } from 'utils';
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { TransitLookupResult } from 'api/transitLookupApi';
import { ACTIVITY_KIND } from 'constants';
import type { Country, FlightInfo, TransitInfo } from 'types';
import type { CountrySource, TransportDraft } from '../types';

/** Pull the most country-like token out of the smart text. Bias the
 *  destination over the origin: take the chunk after the last "to" / arrow,
 *  then strip trailing date / cost / preposition noise. The async catalog
 *  lookup does the real resolution; this just narrows the query. */
const guessCountryQuery = (text: string): string => {
    const lower = text.trim();
    if (!lower) return '';
    const arrowSplit = lower.split(/\s+(?:to|->|→)\s+/i);
    const tail =
        arrowSplit.length > 1 ? arrowSplit[arrowSplit.length - 1] : lower;
    const cut = tail.split(
        /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
    )[0];
    return (cut || tail).trim();
};

export interface TransportResolverProps {
    transport: TransportDraft;
    setTransport: Dispatch<SetStateAction<TransportDraft>>;
    country: Country | null;
    /** How the current country was set — gates derivation so a flight's
     *  arrival airport can override a text guess but neither touches a user
     *  pick. */
    countrySource: CountrySource;
    isoDefaultDate: string;
    emptyFlightSegment: (date: string) => FlightInfo;
    emptyTransitSegment: (date: string) => TransitInfo;
    onCountryChange: (country: Country, source: 'airport' | 'text') => void;
    /** Per-segment "couldn't find this flight/route" tracking, lifted to the
     *  orchestrator so the (now unmounted-on-confirm) DescribeStep can still
     *  surface the warning. */
    setLookupNotFound: Dispatch<SetStateAction<Record<number, string>>>;
}

const isFlightKind = (kind: TransportDraft['kind']) =>
    kind === ACTIVITY_KIND.FLIGHT;

/**
 * Headless resolver that owns the asynchronous transport enrichment so it
 * keeps running no matter which wizard step is mounted:
 *  - flight / transit lookup watchers (route, times) per segment, and
 *  - the destination-country derivation, from a flight's arrival airport
 *    or, for any other kind, from the smart text.
 *
 * The orchestrator renders exactly one of these for ALL steps. Without it,
 * clicking "Continue" before a lookup settled would land on the Confirm
 * step with a blank route / unresolved country, because DescribeStep
 * (which used to host these) is unmounted there.
 */
const TransportResolver = ({
    transport,
    setTransport,
    country,
    countrySource,
    isoDefaultDate,
    emptyFlightSegment,
    emptyTransitSegment,
    onCountryChange,
    setLookupNotFound,
}: TransportResolverProps) => {
    const { kind } = transport;

    // Derive the destination from a flight's arrival airport (e.g. "UA123" →
    // LHR→EWR → United States). Two hops: arrival IATA → airports catalog (its
    // country) → countries catalog (the Country with a savable id). This is the
    // AUTHORITATIVE source for a flight, so — unlike the text fallback below —
    // it keeps running even after the text path set a provisional country, and
    // OVERRIDES it. Only an explicit user pick (`source === 'user'`) is left
    // untouched, so derivation can't fight a manual correction.
    // Destination country derives from the FINAL leg's arrival, not the first
    // segment's — a stopover flight (PTY → SJO → BOG) lands in Colombia (BOG),
    // not Costa Rica (the layover).
    const arrivalAirport =
        transport.flightSegments[transport.flightSegments.length - 1]
            ?.arrivalAirport?.trim() ?? '';
    const flightNumber =
        transport.flightSegments[0]?.flightNumber?.trim() ?? '';

    // Resolve airport codes from a free-text route, INCLUDING stopovers:
    // "panama to colombia with stopover in costa rica" → PTY → SJO → BOG, one
    // segment per leg. Only for a flight with no flight number to look up (the
    // lookup fills airports itself). Up to 4 stops (→ 3 legs) via fixed hook
    // slots (rules of hooks forbid a loop); the catalog ranks a country/city
    // query's primary hub first.
    const canRouteResolve = isFlightKind(kind) && !flightNumber;
    const flightStops = useMemo(
        () =>
            canRouteResolve
                ? parseRouteStops(transport.smartText).slice(0, 4)
                : [],
        [canRouteResolve, transport.smartText],
    );
    const { data: routeCode0 } = useDestinationAirport(
        flightStops[0],
        !!flightStops[0],
    );
    const { data: routeCode1 } = useDestinationAirport(
        flightStops[1],
        !!flightStops[1],
    );
    const { data: routeCode2 } = useDestinationAirport(
        flightStops[2],
        !!flightStops[2],
    );
    const { data: routeCode3 } = useDestinationAirport(
        flightStops[3],
        !!flightStops[3],
    );
    const routeAirportsAppliedRef = useRef('');
    useEffect(() => {
        if (!isFlightKind(kind)) return;
        const codes = [routeCode0, routeCode1, routeCode2, routeCode3].slice(
            0,
            flightStops.length,
        );
        // Single typed city ("flight to bogota") — no leg to form; fill the
        // open arrival side, mirroring the old single-endpoint behavior.
        if (codes.filter(Boolean).length < 2) {
            const only = flightStops.length === 1 ? codes[0] : undefined;
            if (!only) return;
            const key = `solo:${only}`;
            if (routeAirportsAppliedRef.current === key) return;
            setTransport((prev) => {
                if (
                    !isFlightKind(prev.kind) ||
                    prev.flightSegments[0]?.flightNumber?.trim()
                )
                    return prev;
                const segs = prev.flightSegments.length
                    ? [...prev.flightSegments]
                    : [emptyFlightSegment(isoDefaultDate)];
                if (segs[0]?.arrivalAirport) return prev;
                routeAirportsAppliedRef.current = key;
                segs[0] = { ...segs[0], arrivalAirport: only };
                return { ...prev, flightSegments: segs };
            });
            return;
        }
        const key = codes.map((c) => c ?? '').join('|');
        if (routeAirportsAppliedRef.current === key) return;
        routeAirportsAppliedRef.current = key;
        setTransport((prev) => {
            // A flight number means the lookup owns the airports — don't fight.
            if (
                !isFlightKind(prev.kind) ||
                prev.flightSegments[0]?.flightNumber?.trim()
            )
                return prev;
            const legCount = Math.max(1, codes.length - 1);
            const existing = prev.flightSegments ?? [];
            const legs = Array.from({ length: legCount }, (_, i) => {
                const base = existing[i] ?? emptyFlightSegment(isoDefaultDate);
                const dep = codes[i];
                const arr = codes[i + 1];
                return {
                    ...base,
                    ...(dep ? { departAirport: dep } : {}),
                    ...(arr ? { arrivalAirport: arr } : {}),
                };
            });
            return {
                ...prev,
                flightSegments: [...legs, ...existing.slice(legCount)],
            };
        });
        // setTransport / emptyFlightSegment stable; fire on resolved codes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeCode0, routeCode1, routeCode2, routeCode3, kind]);

    const needAirportCountry =
        isFlightKind(kind) &&
        countrySource !== 'user' &&
        arrivalAirport.length >= 3;
    const { data: airportData } = useAirports(
        needAirportCountry ? arrivalAirport : '',
    );
    const derivedCountryName = useMemo(() => {
        if (!needAirportCountry) return '';
        const items = airportData?.items ?? [];
        const match =
            items.find(
                (a) =>
                    a.iataCode.toUpperCase() === arrivalAirport.toUpperCase(),
            ) ?? items[0];
        return match?.country ?? '';
    }, [airportData, needAirportCountry, arrivalAirport]);
    const { data: derivedCountryMatches } = useCountries(derivedCountryName, {
        enabled: derivedCountryName.length > 0,
        limit: 1,
    });
    useEffect(() => {
        if (!needAirportCountry) return;
        const best = derivedCountryMatches?.[0];
        // Skip when it already matches — including `country.id` in the deps
        // lets a text-derived country be overridden, then settles (best === id).
        if (!best || best.id === country?.id) return;
        onCountryChange(
            {
                id: best.id,
                name: best.name,
                code: best.code,
                local: best.local ?? undefined,
                image: best.image ?? undefined,
            },
            'airport',
        );
        // onCountryChange is stable; fire once per resolved match.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [derivedCountryMatches, needAirportCountry, country?.id]);

    // General fallback — derive the destination from the smart text for any
    // kind the arrival-airport path doesn't cover (transit, "I'll add later",
    // or a flight with no flight number to look up). `guessCountryQuery`
    // narrows the text to the chunk after the last "to" / arrow; the catalog
    // resolves it. Suppressed for a flight whose number is entered but whose
    // arrival airport hasn't resolved yet, so a fuzzy guess (e.g. "Panama
    // City" → the wrong country) can't preempt the authoritative airport.
    const flightAwaitingAirport =
        isFlightKind(kind) && flightNumber.length > 0 && arrivalAirport.length < 3;
    const textQuery = !country ? guessCountryQuery(transport.smartText) : '';
    const needTextCountry =
        !country &&
        !needAirportCountry &&
        !flightAwaitingAirport &&
        textQuery.length > 0;
    const { data: textCountryMatches } = useCountries(
        needTextCountry ? textQuery : '',
        { enabled: needTextCountry, limit: 1 },
    );
    useEffect(() => {
        if (!needTextCountry) return;
        const best = textCountryMatches?.[0];
        if (!best) return;
        onCountryChange(
            {
                id: best.id,
                name: best.name,
                code: best.code,
                local: best.local ?? undefined,
                image: best.image ?? undefined,
            },
            'text',
        );
        // onCountryChange is stable; fire once per resolved match.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textCountryMatches, needTextCountry]);

    const applyFlightLookup = (idx: number, result: FlightLookupResult) => {
        setTransport((prev) => {
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const cur = segs[idx] ?? {};
            segs[idx] = {
                ...cur,
                departAirport: result.departAirport ?? cur.departAirport,
                arrivalAirport: result.arrivalAirport ?? cur.arrivalAirport,
                departDate: result.departDate ?? cur.departDate,
                departTime: result.departTime ?? cur.departTime,
                arrivalDate: result.arrivalDate ?? cur.arrivalDate,
                arrivalTime: result.arrivalTime ?? cur.arrivalTime,
            };
            return { ...prev, flightSegments: segs };
        });
    };

    const applyTransitLookup = (idx: number, result: TransitLookupResult) => {
        setTransport((prev) => {
            const segs = prev.transitSegments.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment(isoDefaultDate)];
            const cur = segs[idx] ?? {};
            segs[idx] = {
                ...cur,
                operator: result.operator ?? cur.operator,
                number: result.number ?? cur.number,
                departStation: result.departStation ?? cur.departStation,
                arrivalStation: result.arrivalStation ?? cur.arrivalStation,
                departDate: result.departDate ?? cur.departDate,
                departTime: result.departTime ?? cur.departTime,
                arrivalDate: result.arrivalDate ?? cur.arrivalDate,
                arrivalTime: result.arrivalTime ?? cur.arrivalTime,
            };
            return { ...prev, transitSegments: segs };
        });
    };

    const clearNotFound = (idx: number) =>
        setLookupNotFound((prev) => {
            if (!(idx in prev)) return prev;
            const next = { ...prev };
            delete next[idx];
            return next;
        });

    if (!kind) return null;

    return (
        <>
            {isFlightKind(kind) &&
                transport.flightSegments.map((seg, idx) => (
                    <FlightSegmentLookupWatcher
                        key={`flw-${idx}`}
                        flightNumber={seg.flightNumber}
                        departDate={seg.departDate}
                        onResult={(r) => {
                            applyFlightLookup(idx, r);
                            clearNotFound(idx);
                        }}
                        onNotFound={(num) =>
                            setLookupNotFound((prev) => ({
                                ...prev,
                                [idx]: num,
                            }))
                        }
                    />
                ))}
            {(kind === ACTIVITY_KIND.TRAIN || kind === ACTIVITY_KIND.BUS) &&
                transport.transitSegments.map((seg, idx) => (
                    <TransitSegmentLookupWatcher
                        key={`tlw-${idx}`}
                        operator={seg.operator}
                        number={seg.number}
                        kind={kind === ACTIVITY_KIND.TRAIN ? 'train' : 'bus'}
                        departDate={seg.departDate}
                        country={country?.name}
                        onResult={(r) => {
                            applyTransitLookup(idx, r);
                            clearNotFound(idx);
                        }}
                        onNotFound={(label) =>
                            setLookupNotFound((prev) => ({
                                ...prev,
                                [idx]: label,
                            }))
                        }
                    />
                ))}
        </>
    );
};

export default TransportResolver;
