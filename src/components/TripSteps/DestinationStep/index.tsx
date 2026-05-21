import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import SearchBar from 'components/SearchBar';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import type { Country, Destination, TripState } from 'types';
import './index.scss';

interface DestinationStepProps {
    data: TripState | undefined;
}

/** Step shown only for single-destination trips, and only when the user
 *  entered the wizard without a country already saved. AI-search and
 *  top-places entries skip this step because the country is already in
 *  `data.destinations[0]`. */
const DestinationStep = ({ data }: DestinationStepProps) => {
    const dispatch = useTripDispatch();
    const rootCountry = data?.destinations?.[0]?.country;

    const handleCountryChange = (country: Country) => {
        const destinations = data?.destinations ?? [];
        const next: Destination[] =
            destinations.length > 0
                ? [{ ...destinations[0], country }, ...destinations.slice(1)]
                : [{ id: 0, country, itinerary: [] } as Destination];
        dispatch(basicInfo({ destinations: next }));
    };

    return (
        <div className="trip-destination-step">
            <h2 className="trip-step-headline">Where are you going?</h2>
            <p className="trip-step-sub">
                Pick a country. You'll add specific cities and activities a
                bit later.
            </p>

            <div className="trip-destination-field">
                <label className="trip-destination-label">
                    <FlightTakeoffRoundedIcon /> Destination
                </label>
                <SearchBar
                    defaultValue={rootCountry?.name ? rootCountry : null}
                    type="simple"
                    onSelected={handleCountryChange}
                />
            </div>
        </div>
    );
};

export default DestinationStep;
