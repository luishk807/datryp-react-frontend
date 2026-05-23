import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import type { Friend, TripChangeEvent, TripState } from 'types';
import './index.scss';

interface PeopleStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/**
 * Step 2 of the new 3-step create flow — combines the legacy Organizers
 * and Participants steps. Organizers can edit the trip; participants
 * just come along. The current user is auto-seeded as an organizer (see
 * TripSteps) so this screen always opens with at least one entry.
 */
const PeopleStep = ({ data, onChange }: PeopleStepProps) => {
    const organizers: Friend[] = data?.organizer ?? [];
    const friends: Friend[] = data?.friends ?? [];

    const handleOrganizer = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('organizer', e);
    };

    const handleFriends = (
        _name: string | undefined,
        e: { target: { value: Friend[] } }
    ) => {
        onChange('friends', e);
    };

    return (
        <div className="trip-people-step">
            <h2 className="trip-step-headline">Who's coming along?</h2>
            <p className="trip-step-sub">
                You're in by default. Add co-organizers if someone else can edit
                the trip, and participants for everyone else along for the ride.
            </p>

            <section className="trip-people-section">
                <header className="trip-people-section-head">
                    <PersonRoundedIcon className="trip-people-section-icon" />
                    <div>
                        <h3 className="trip-people-section-title">Organizers</h3>
                        <p className="trip-people-section-sub">
                            Can edit the trip. You're added automatically.
                        </p>
                    </div>
                </header>
                <FriendPicker
                    title="Organizers"
                    name="organizer"
                    selectedOptions={organizers}
                    onChange={handleOrganizer}
                />
            </section>

            <section className="trip-people-section">
                <header className="trip-people-section-head">
                    <GroupsRoundedIcon className="trip-people-section-icon" />
                    <div>
                        <h3 className="trip-people-section-title">
                            Participants
                        </h3>
                        <p className="trip-people-section-sub">
                            Travelers along for the ride — they can split
                            budgets. Going solo? Leave this empty.
                        </p>
                    </div>
                </header>
                <FriendPicker
                    title="Participants"
                    name="friends"
                    selectedOptions={friends}
                    onChange={handleFriends}
                />
            </section>
        </div>
    );
};

export default PeopleStep;
