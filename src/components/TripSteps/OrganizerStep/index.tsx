import FriendPicker from 'components/DestinationDetail/FriendPicker';
import type { Friend, TripChangeEvent, TripState } from 'types';
import './index.scss';

interface OrganizerStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 4 of the create flow. The wizard auto-seeds the current user into
 *  `data.organizer` (see `TripSteps`), so this step always starts with at
 *  least one entry — the user can add co-organizers or click Next to keep
 *  themselves as the only one. */
const OrganizerStep = ({ data, onChange }: OrganizerStepProps) => {
    const selected: Friend[] = data?.organizer ?? [];

    const handlePicker = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('organizer', e);
    };

    return (
        <div className="trip-organizer-step">
            <h2 className="trip-step-headline">Who's organizing?</h2>
            <p className="trip-step-sub">
                You're in by default. Add co-organizers if you're planning this
                with someone else — they'll be able to edit the trip too.
            </p>

            <FriendPicker
                title="Organizers"
                name="organizer"
                selectedOptions={selected}
                onChange={handlePicker}
            />
        </div>
    );
};

export default OrganizerStep;
