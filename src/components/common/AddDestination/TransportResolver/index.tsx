import {
    useEffect,
    useMemo,
    type Dispatch,
    type SetStateAction,
} from 'react';
import FlightSegmentLookupWatcher from 'components/common/AddPlaceBtn/FlightSegmentLookupWatcher';
import TransitSegmentLookupWatcher from 'components/common/AddPlaceBtn/TransitSegmentLookupWatcher';
import { useAirports } from 'api/hooks/useAirports';
import { useCountries } from 'api/hooks/useCountries';
import { useDestinationAirport } from 'api/hooks/useDestinationAirport';
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

/** Strip transport verbs / "from" and trailing date-cost noise off a place
 *  phrase so it resolves cleanly against the airports catalog. */
const cleanPlacePhrase = (s: string): string =>
    s
        .replace(/\b(?:flights?|fly|flying|train|bus|coach)\b/gi, '')
        .replace(/\bfrom\b/gi, '')
        .split(
            /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
        )[0]
        .trim();

/** Pull an origin → destination route out of free smart text, e.g.
 *  "flight from panama to iceland" → { origin: "panama", destination:
 *  "iceland" }. Returns empty sides when the text has no "to" / arrow split
 *  (a bare destination like "Panama" is handled by guessCountryQuery, not
 *  here). Each side is resolved to an airport code by the catalog lookup. */
const parseRoute = (
    text: string,
): { origin?: string; destination?: string } => {
    const raw = (text ?? '').trim();
    if (!raw) return {};
    const parts = raw.split(/\s+(?:to|->|→)\s+/i);
    if (parts.length < 2) return {};
    const destination = cleanPlacePhrase(parts[parts.length - 1]);
    const origin = cleanPlacePhrase(parts.slice(0, -1).join(' to '));
    return {
        origin: origin || undefined,
        destination: destination || undefined,
    };
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
    const arrivalAirport =
        transport.flightSegments[0]?.arrivalAirport?.trim() ?? '';
    const flightNumber =
        transport.flightSegments[0]?.flightNumber?.trim() ?? '';

    // Resolve airport codes from a free-text route — "flight from panama to
    // iceland" → depart PTY / arrive KEF. Only for a flight with no flight
    // number to look up (the lookup fills airports itself) and only fills a
    // side that's still empty, so it never fights the lookup or a manual edit.
    // The catalog ranks a country/city query's primary hub first.
    const departAirport =
        transport.flightSegments[0]?.departAirport?.trim() ?? '';
    const route = useMemo(
        () => parseRoute(transport.smartText),
        [transport.smartText],
    );
    const canRouteResolve = isFlightKind(kind) && !flightNumber;
    const { data: routeDepartCode } = useDestinationAirport(
        route.origin,
        canRouteResolve && !!route.origin && !departAirport,
    );
    const { data: routeArriveCode } = useDestinationAirport(
        route.destination,
        canRouteResolve && !!route.destination && !arrivalAirport,
    );
    useEffect(() => {
        if (!routeDepartCode && !routeArriveCode) return;
        setTransport((prev) => {
            if (!isFlightKind(prev.kind)) return prev;
            // A flight number means the lookup owns the airports — don't fight.
            if (prev.flightSegments[0]?.flightNumber?.trim()) return prev;
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const cur = segs[0];
            const nextDepart =
                !cur.departAirport && routeDepartCode
                    ? routeDepartCode
                    : cur.departAirport;
            const nextArrival =
                !cur.arrivalAirport && routeArriveCode
                    ? routeArriveCode
                    : cur.arrivalAirport;
            if (
                nextDepart === cur.departAirport &&
                nextArrival === cur.arrivalAirport
            ) {
                return prev;
            }
            segs[0] = {
                ...cur,
                departAirport: nextDepart,
                arrivalAirport: nextArrival,
            };
            return { ...prev, flightSegments: segs };
        });
        // setTransport / emptyFlightSegment are stable; fire on resolved codes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeDepartCode, routeArriveCode]);

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
