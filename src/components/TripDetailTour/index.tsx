/**
 * Onboarding tour for the read-only trip-detail view. Points out the
 * key affordances a user finds AFTER saving their trip: the Confirm
 * Trip button (lifecycle promote), the activity status / live "now"
 * indicator, the participant-notify bell, the share/export menu, and
 * the Edit Trip button.
 *
 * Auto-runs once per user (localStorage `trip-detail-tour-completed-
 * v1`) the first time they land on `/trip-detail?id=...`. After
 * dismissal, the "Take the tour" pill in the trip-detail header
 * re-runs it any time.
 */
import { useMemo } from 'react';
import {
    Joyride,
    EVENTS,
    STATUS,
    type EventData,
    type Step,
} from 'react-joyride';

export const TRIP_DETAIL_TOUR_STORAGE_KEY = 'trip-detail-tour-completed-v1';

export interface TripDetailTourProps {
    /** Drive whether the tour is currently running. The parent owns
     *  this state so it can be flipped by both the auto-trigger and
     *  the manual "Take the tour" button. */
    run: boolean;
    /** Called when the tour finishes, the user skips, or the user
     *  closes the tooltip. Parent should set `run=false` here and
     *  (typically) mark the tour as completed in localStorage. */
    onClose: () => void;
}

const TripDetailTour = ({ run, onClose }: TripDetailTourProps) => {
    const steps = useMemo<Step[]>(
        () => [
            {
                target: 'body',
                placement: 'center',
                title: 'Your trip is saved',
                content: (
                    <p>
                        Here's the read-only view of your trip. A few
                        things to know before you head out — let's
                        walk through them in under a minute.
                    </p>
                ),
            },
            {
                target: '.trip-detail-header',
                placement: 'bottom',
                title: 'Trip lifecycle',
                content: (
                    <p>
                        A trip moves through{' '}
                        <strong>Planning</strong> →{' '}
                        <strong>Confirmed</strong> →{' '}
                        <strong>Completed</strong>. Click{' '}
                        <strong>Confirm Trip</strong> when bookings
                        are locked. After that, activities can be
                        ticked off one by one.
                    </p>
                ),
            },
            {
                target: '.notify-participants-checkbox',
                placement: 'bottom',
                title: 'Quiet edits',
                content: (
                    <p>
                        Untick the bell to skip the email + in-app
                        notification fan-out when you save a tiny
                        edit. The trip still saves; the rest of the
                        group just isn't pinged.
                    </p>
                ),
            },
            {
                target: '.trip-detail-edit-btn',
                placement: 'bottom',
                title: 'Edit the trip',
                content: (
                    <p>
                        Tap <strong>Edit Trip</strong> to change
                        dates, swap places, add participants, or
                        adjust the budget. Save Changes commits the
                        edit and returns you here.
                    </p>
                ),
            },
            {
                target: '.trip-detail-download-btn',
                placement: 'bottom',
                title: 'Share & export',
                content: (
                    <p>
                        Send the trip on WhatsApp or email, copy the
                        link to paste anywhere, or download a PDF /
                        Excel summary for offline use. Print to take
                        it physically with you.
                    </p>
                ),
            },
            {
                target: '.date-block',
                placement: 'top',
                title: 'Day-by-day timeline',
                content: (
                    <p>
                        Every day in your trip range has its own row.
                        Activities are sorted by start time. Past
                        activities dim once their end time passes.
                        Look for a green stripe along the top — that
                        marks the activity{' '}
                        <strong>happening right now</strong> and
                        grows as time elapses.
                    </p>
                ),
            },
            {
                target: '.activity-content-trip',
                placement: 'top',
                title: 'Per-activity status',
                content: (
                    <p>
                        Once the trip is Confirmed, each activity
                        gets a checkmark to mark it{' '}
                        <strong>Completed</strong>. Past-due
                        activities auto-tick if you don't get to them
                        — you can always toggle them back. Tap a
                        place name to open its full detail in a new
                        tab.
                    </p>
                ),
            },
        ],
        []
    );

    const handleEvent = (data: EventData) => {
        if (
            data.status === STATUS.FINISHED ||
            data.status === STATUS.SKIPPED ||
            data.type === EVENTS.TOUR_END
        ) {
            onClose();
        }
    };

    return (
        <Joyride
            run={run}
            steps={steps}
            continuous
            options={{
                primaryColor: '#3cb54b',
                textColor: '#1a1a1a',
                backgroundColor: '#ffffff',
                arrowColor: '#ffffff',
                overlayColor: 'rgba(0, 0, 0, 0.45)',
                zIndex: 2000,
                showProgress: true,
                buttons: ['skip', 'back', 'primary'],
                closeButtonAction: 'skip',
            }}
            styles={{
                tooltip: {
                    borderRadius: 14,
                    padding: 20,
                    fontSize: '0.95rem',
                    maxWidth: 380,
                    boxShadow:
                        '0 12px 40px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.05)',
                },
                tooltipTitle: {
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: '#1a1a1a',
                    lineHeight: 1.25,
                },
                tooltipContent: {
                    padding: 0,
                    lineHeight: 1.6,
                    color: 'rgba(0, 0, 0, 0.78)',
                },
                buttonPrimary: {
                    backgroundColor: '#3cb54b',
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                },
                buttonBack: {
                    color: 'rgba(0, 0, 0, 0.6)',
                    marginRight: 8,
                    fontSize: '0.85rem',
                },
                buttonSkip: {
                    color: 'rgba(0, 0, 0, 0.5)',
                    fontSize: '0.85rem',
                },
            }}
            locale={{
                back: 'Back',
                close: 'Close',
                last: 'Got it',
                next: 'Next',
                skip: 'Skip tour',
            }}
            onEvent={handleEvent}
        />
    );
};

export default TripDetailTour;
