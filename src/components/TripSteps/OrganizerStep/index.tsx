import { useTranslation } from 'react-i18next';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import type { Friend, TripChangeEvent, TripState } from 'types';

interface OrganizerStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 5 — organizers. Anyone here can edit the trip. The current user
 *  is auto-seeded as an organizer (see TripSteps) so this always opens
 *  with at least one entry. */
const OrganizerStep = ({ data, onChange }: OrganizerStepProps) => {
    const { t } = useTranslation();
    const organizers: Friend[] = data?.organizer ?? [];

    const handleOrganizer = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('organizer', e);
    };

    return (
        <div
            className="trip-step-screen trip-organizer-step"
            data-tour="trip-organizers"
        >
            <h2 className="trip-step-headline">
                {t('createTrip.organizers.title')}
            </h2>
            <p className="trip-step-sub">
                {t('createTrip.organizers.subtitle')}
            </p>

            <div className="trip-step-card">
                <header className="trip-step-field">
                    <label className="trip-step-label">
                        <PersonRoundedIcon />{' '}
                        {t('createTrip.organizers.label')}
                    </label>
                </header>
                {/* No floating field label — the section header above
                    already labels this picker. Passing an empty title
                    keeps the MUI Autocomplete from rendering a duplicate
                    "Organizers" label that overlaps the header. */}
                <FriendPicker
                    title=""
                    ariaLabel={t('createTrip.organizers.label')}
                    name="organizer"
                    selectedOptions={organizers}
                    onChange={handleOrganizer}
                />
            </div>
        </div>
    );
};

export default OrganizerStep;
