import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { TripState } from 'types';
import './index.scss';

interface TripDestinationChipProps {
    data: TripState | undefined;
}

/** Persistent "Going to <city>, <country>" context chip shown at the top of
 *  every create step once a destination is known — so the user keeps sight
 *  of where the trip is headed as they move through type → dates → budget →
 *  people. Renders nothing until a country is set. */
const TripDestinationChip = ({ data }: TripDestinationChipProps) => {
    const rootCountry = data?.destinations?.[0]?.country;
    if (!rootCountry?.name) return null;

    // Pull the seeded "Flight to <city>" / "Train to <city>" activity name
    // so the chip can read "Paris, France" rather than just the country
    // when the trip started from a city page.
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

    // Dedupe "Iceland, Iceland" — a country-page seed names the leg
    // "Flight to <country>", so the inferred "city" can equal the country.
    const label =
        inferredCity && inferredCity !== rootCountry.name
            ? `${inferredCity}, ${rootCountry.name}`
            : rootCountry.name;

    return (
        <div className="trip-destination-chip" aria-label="Trip destination">
            <PlaceOutlinedIcon
                className="trip-destination-chip-icon"
                fontSize="small"
            />
            <span className="trip-destination-chip-label">Going to</span>
            <span className="trip-destination-chip-value">{label}</span>
        </div>
    );
};

export default TripDestinationChip;
