import { useState } from 'react';
import classNames from 'classnames';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import './index.scss';

export interface AirlineLogoProps {
    /** IATA airline code (2-3 chars) — the preferred source. */
    iata?: string | null;
    /** Flight number like "UA123". When `iata` is absent the carrier
     *  code is derived from this value's leading prefix. */
    flightNumber?: string | null;
    /** Accessible label / alt text — usually the airline name. */
    label?: string | null;
    className?: string;
}

// IATA carrier prefix: two letters (UA), or a letter+digit / digit+letter
// (U2, B6, 9W) — always followed by the numeric flight number we ignore.
const CARRIER_PREFIX = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])/;

/** Resolve the IATA carrier code from an explicit code or a flight number.
 *  Returns null when neither yields a usable 2-3 char code. */
export const deriveAirlineCode = (
    iata?: string | null,
    flightNumber?: string | null
): string | null => {
    const direct = iata?.trim().toUpperCase();
    if (direct && direct.length >= 2) return direct.slice(0, 3);
    const fn = flightNumber?.replace(/\s+/g, '').trim().toUpperCase();
    if (!fn) return null;
    const match = CARRIER_PREFIX.exec(fn);
    return match ? match[1] : null;
};

/** Square airline logo sourced from the Kiwi.com logo CDN, keyed by the
 *  carrier's IATA code. Falls back to a plane glyph when the code can't
 *  be resolved or the CDN has no logo for it (404 → onError). */
const AirlineLogo = ({
    iata,
    flightNumber,
    label,
    className,
}: AirlineLogoProps) => {
    const code = deriveAirlineCode(iata, flightNumber);
    const [failed, setFailed] = useState(false);

    if (!code || failed) {
        return (
            <span
                className={classNames(
                    'airline-logo',
                    'airline-logo--fallback',
                    className
                )}
                aria-hidden="true"
            >
                <FlightTakeoffRoundedIcon className="airline-logo-icon" />
            </span>
        );
    }

    return (
        <img
            className={classNames('airline-logo', className)}
            src={`https://images.kiwi.com/airlines/64/${code}.png`}
            loading="lazy"
            alt={label ?? `${code} logo`}
            onError={() => setFailed(true)}
        />
    );
};

export default AirlineLogo;
