import { useTranslation } from 'react-i18next';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchBar from 'components/SearchBar';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import type { Country, Destination, TripState } from 'types';
import './index.scss';

interface DestinationStepProps {
    data: TripState | undefined;
}

/** Step 2 — destination country. Only rendered for single-destination
 *  trips that didn't enter with a country preset (see needsDestinationStep
 *  in TripSteps). Multi-destination trips pick countries per-day in the
 *  Itinerary step instead. */
const DestinationStep = ({ data }: DestinationStepProps) => {
    const { t } = useTranslation();
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
        <div
            className="trip-step-screen trip-destination-step"
            data-tour="trip-destination"
        >
            <h2 className="trip-step-headline">
                {t('createTrip.destination.title')}
            </h2>
            <p className="trip-step-sub">
                {t('createTrip.destination.subtitle')}
            </p>

            <div className="trip-step-card">
                <div className="trip-step-field">
                    <label className="trip-step-label">
                        <PlaceOutlinedIcon />{' '}
                        {t('createTrip.destination.label')}
                    </label>
                    <SearchBar
                        defaultValue={rootCountry?.name ? rootCountry : null}
                        type="simple"
                        onSelected={handleCountryChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default DestinationStep;
