/**
 * Onboarding tour for the read-only trip-detail view. Points out the
 * key affordances a user finds AFTER saving their trip: the trip
 * lifecycle promote, the view controls (Focus / Night / Text-only),
 * the offline download, the share/export → PDF menu, the participant-
 * notify bell, the day-by-day timeline, and per-activity status.
 *
 * Auto-runs once per user (localStorage `trip-detail-tour-completed-
 * v1`) the first time they land on `/trip-detail?id=...`. After
 * dismissal, the "Take the tour" pill in the trip-detail header
 * re-runs it any time.
 *
 * react-joyride v3 skips any step whose target isn't mounted, so the
 * conditionally-rendered anchors here (the offline button shows only
 * on Confirmed desktop trips; the notify bell only on multi-member
 * trips) safely no-op when absent rather than stalling the tour.
 */
import { useMemo } from 'react';
import {
    Joyride,
    EVENTS,
    STATUS,
    type EventData,
    type Step,
} from 'react-joyride';
// Shared tour polish (top accent stripe, hover states). Lives in
// the TripTour folder since that's the primary consumer; this tour
// just opts in.
import 'components/TripTour/index.scss';

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
                target: '.trip-detail-actions-left .trip-detail-basic-info-toggle',
                placement: 'bottom',
                title: 'Trip details & editing',
                content: (
                    <p>
                        Tap <strong>Trip details</strong> to expand the
                        overview — dates, destination, budget, and who's
                        going. While the trip is in Planning the organizer
                        can edit any of it (and the day list) right here;
                        changes save as you go.
                    </p>
                ),
            },
            {
                target: '.trip-detail-focusmode-toggle',
                placement: 'bottom',
                title: 'Focus mode',
                content: (
                    <p>
                        Tap <strong>Focus</strong> to hide every overview
                        card — even the app's header and nav — so the page
                        is just your dates and activities. A floating{' '}
                        <strong>Show</strong> pill brings the chrome back.
                        Great for reading the itinerary on the go.
                    </p>
                ),
            },
            {
                target: '.trip-detail-night-toggle',
                placement: 'bottom',
                title: 'Night view',
                content: (
                    <p>
                        Tap <strong>Night</strong> for a dark theme scoped
                        to the itinerary — easier on the eyes on a plane or
                        in a dim hotel room. It resets to day view when you
                        leave the page.
                    </p>
                ),
            },
            {
                target: '.trip-detail-textonly-toggle',
                placement: 'bottom',
                title: 'Text-only view',
                content: (
                    <p>
                        Tap <strong>Text only</strong> to hide every
                        activity's photo for a dense, scannable list. Handy
                        on a slow connection or when you just want the plan,
                        not the pictures.
                    </p>
                ),
            },
            {
                target: '.trip-offline-download-wrap',
                placement: 'bottom',
                title: 'Take it offline',
                content: (
                    <p>
                        Once a trip is <strong>Confirmed</strong>, tap{' '}
                        <strong>Offline</strong> to save a copy to this
                        device. It opens with no signal — perfect for
                        reading your itinerary abroad without data. On
                        mobile this lives in the <strong>⋮</strong> menu.
                    </p>
                ),
            },
            {
                target: '.trip-detail-download-btn',
                placement: 'bottom',
                title: 'Share & download PDF',
                content: (
                    <p>
                        Tap <strong>Share</strong> to send the trip on
                        WhatsApp or email, copy the link, or{' '}
                        <strong>Download PDF</strong> — a branded report
                        with the itinerary and expense summary. You can
                        also grab an <strong>Excel</strong> sheet or{' '}
                        <strong>Print</strong> a paper copy.
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
                target: '.date-block',
                placement: 'bottom',
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
                    // Match TripTour: wider + more padding so body copy
                    // doesn't break on every other word at the default
                    // maxWidth=380.
                    padding: '22px 26px',
                    fontSize: '0.95rem',
                    maxWidth: 460,
                    boxShadow:
                        '0 12px 40px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.05)',
                },
                tooltipTitle: {
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: 8,
                    color: '#1a1a1a',
                    lineHeight: 1.25,
                },
                tooltipContent: {
                    padding: 0,
                    lineHeight: 1.6,
                    color: 'rgba(0, 0, 0, 0.78)',
                },
                tooltipFooter: {
                    marginTop: 14,
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
