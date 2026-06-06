import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import { ACTIVITY_KIND } from 'constants';
import type { TransportDraft, TransportKind } from './TransportStep';

/** User-facing label + icon for each transport kind. Single source for the
 *  chooser tiles, the collapsed "active mode" row, and the Confirm review. */
export const TRANSPORT_MODE: Record<
    TransportKind,
    { label: string; Icon: typeof FlightRoundedIcon }
> = {
    [ACTIVITY_KIND.FLIGHT]: { label: 'Flight', Icon: FlightRoundedIcon },
    [ACTIVITY_KIND.TRAIN]: { label: 'Train', Icon: DirectionsTransitRoundedIcon },
    [ACTIVITY_KIND.BUS]: { label: 'Bus', Icon: DirectionsBusRoundedIcon },
    [ACTIVITY_KIND.RENTAL_CAR]: {
        label: 'Rental Car',
        Icon: CarRentalRoundedIcon,
    },
};

/** Compact one-line summary of a transport draft's first segment.
 *  Flights: `CM123 · CUN → PTY · 2026-06-06 · 11:46`.
 *  Transit: `<operator> · <number> · <from> → <to> · <date> · <time>`.
 *  Returns null when there's nothing meaningful to show yet. */
export const buildTransportSummary = (
    transport: TransportDraft,
): string | null => {
    const { kind } = transport;
    if (!kind) return null;

    if (kind === ACTIVITY_KIND.FLIGHT) {
        const seg = transport.flightSegments[0];
        if (!seg) return null;
        const route =
            seg.departAirport && seg.arrivalAirport
                ? `${seg.departAirport} → ${seg.arrivalAirport}`
                : null;
        const parts = [
            seg.flightNumber,
            route,
            seg.departDate,
            seg.departTime,
        ].filter(Boolean);
        return parts.length ? parts.join(' · ') : null;
    }

    const seg = transport.transitSegments[0];
    if (!seg) return null;
    const route =
        seg.departStation && seg.arrivalStation
            ? `${seg.departStation} → ${seg.arrivalStation}`
            : null;
    const parts = [
        seg.operator,
        seg.number,
        route,
        seg.departDate,
        seg.departTime,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
};
