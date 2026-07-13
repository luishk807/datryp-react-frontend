import { useTranslation } from 'react-i18next';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import type { Friend, TripChangeEvent, TripState } from 'types';
import './index.scss';

interface ParticipantsStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 5. Empty by default — solo trips are valid. Adding participants
 *  triggers invite emails + in-app notifications on Finish (gated by the
 *  Notify-participants checkbox the user sees on the last step). */
const ParticipantsStep = ({ data, onChange }: ParticipantsStepProps) => {
    const { t } = useTranslation();
    const selected: Friend[] = data?.friends ?? [];

    const handlePicker = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('friends', e);
    };

    return (
        <div className="trip-participants-step">
            <h2 className="trip-step-headline">
                {t('createTrip.participantsEdit.title')}
            </h2>
            <p className="trip-step-sub">
                {t('createTrip.participantsEdit.subtitle')}
            </p>

            <FriendPicker
                title={t('createTrip.participantsEdit.label')}
                ariaLabel={t('createTrip.participantsEdit.label')}
                name="friends"
                selectedOptions={selected}
                onChange={handlePicker}
            />
        </div>
    );
};

export default ParticipantsStep;
