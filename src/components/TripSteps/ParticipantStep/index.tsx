import { useTranslation } from 'react-i18next';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import type { Friend, TripChangeEvent, TripState } from 'types';

interface ParticipantStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 6 — participants. Travelers along for the ride; they can split
 *  budgets. The current user is auto-seeded (see TripSteps) — remove
 *  yourself if you're planning for someone else. */
const ParticipantStep = ({ data, onChange }: ParticipantStepProps) => {
    const { t } = useTranslation();
    const friends: Friend[] = data?.friends ?? [];

    const handleFriends = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('friends', e);
    };

    return (
        <div
            className="trip-step-screen trip-participant-step"
            data-tour="trip-participants"
        >
            <h2 className="trip-step-headline">
                {t('createTrip.participants.title')}
            </h2>
            <p className="trip-step-sub">
                {t('createTrip.participants.subtitle')}
            </p>

            <div className="trip-step-card">
                <header className="trip-step-field">
                    <label className="trip-step-label">
                        <GroupsRoundedIcon />{' '}
                        {t('createTrip.participants.label')}
                    </label>
                </header>
                {/* No floating field label — the section header above
                    already labels this picker. Passing an empty title
                    keeps the MUI Autocomplete from rendering a duplicate
                    "Participants" label that overlaps the header. */}
                <FriendPicker
                    title=""
                    ariaLabel={t('createTrip.participants.label')}
                    name="friends"
                    selectedOptions={friends}
                    onChange={handleFriends}
                />
            </div>
        </div>
    );
};

export default ParticipantStep;
