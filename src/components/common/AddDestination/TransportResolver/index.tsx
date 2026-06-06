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
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { TransitLookupResult } from 'api/transitLookupApi';
import { ACTIVITY_KIND } from 'constants';
import type { Country, FlightInfo, TransitInfo } from 'types';
import type { TransportDraft } from '../TransportStep';

export interface TransportResolverProps {
    transport: TransportDraft;
    setTransport: Dispatch<SetStateAction<TransportDraft>>;
    country: Country | null;
    isoDefaultDate: string;
    emptyFlightSegment: (date: string) => FlightInfo;
    emptyTransitSegment: (date: string) => TransitInfo;
    onCountryChange: (country: Country | null) => void;
    /** Per-segment "couldn't find this flight/route" tracking, lifted to the
     *  orchestrator so the (now unmounted-on-confirm) TransportStep can still
     *  surface the warning. */
    setLookupNotFound: Dispatch<SetStateAction<Record<number, string>>>;
}

const isFlightKind = (kind: TransportDraft['kind']) =>
    kind === ACTIVITY_KIND.FLIGHT;

/**
 * Headless resolver that owns the asynchronous transport enrichment so it
 * keeps running no matter which wizard step is mounted:
 *  - flight / transit lookup watchers (route, times) per segment, and
 *  - the arrival-airport → destination-country derivation.
 *
 * The orchestrator renders exactly one of these for ALL steps. Without it,
 * clicking "Continue" before a lookup settled would land on the Confirm
 * step with a blank route / unresolved country, because TransportStep
 * (which used to host these) is unmounted there.
 */
const TransportResolver = ({
    transport,
    setTransport,
    country,
    isoDefaultDate,
    emptyFlightSegment,
    emptyTransitSegment,
    onCountryChange,
    setLookupNotFound,
}: TransportResolverProps) => {
    const { kind } = transport;

    // Derive the destination from a flight's arrival airport when no country
    // is set yet (e.g. "UA123" → LHR→EWR → United States). Two hops: arrival
    // IATA → airports catalog (its country) → countries catalog (the Country
    // with a savable id). Disabled once a country is set so it can't loop or
    // fight a user pick.
    const arrivalAirport =
        transport.flightSegments[0]?.arrivalAirport?.trim() ?? '';
    const needAirportCountry =
        isFlightKind(kind) && !country && arrivalAirport.length >= 3;
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
        if (!best) return;
        onCountryChange({
            id: best.id,
            name: best.name,
            code: best.code,
            local: best.local ?? undefined,
            image: best.image ?? undefined,
        });
        // onCountryChange is stable; fire once per resolved match.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [derivedCountryMatches, needAirportCountry]);

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
