/**
 * In-app onboarding tour for the create-trip wizard. Runs as a
 * step-aware walkthrough: the tooltip set swaps as the user advances
 * through Basics → People → Itinerary in the underlying wizard. The
 * tour itself does NOT drive the wizard's Next button — that would
 * conflict with the wizard's own validation flow. Instead each
 * wizard step has its own tour list, and the user runs each one
 * when they land on that step.
 *
 * Auto-runs once per user (localStorage `trip-tour-completed-v1`)
 * the first time they open the wizard. After that, the "Take the
 * tour" pill in the wizard header re-runs the current section's
 * tour any time.
 *
 * Library: react-joyride v3 (named import). Anchors target stable
 * `data-tour` attributes added to the wizard markup; falling back to
 * existing class names where one already nailed the right element
 * (`.trip-mode-cards`, `.step-actions`).
 */
import { useMemo } from 'react';
import {
    Joyride,
    EVENTS,
    STATUS,
    type EventData,
    type Step,
} from 'react-joyride';
import './index.scss';

export const TRIP_TOUR_STORAGE_KEY = 'trip-tour-completed-v1';

/** Which create-flow screen the tour is anchored to. The create flow now
 *  asks one question per screen, so each key maps to a single screen's
 *  tooltips. TripSteps derives the key from the active step's label (the
 *  Destination screen is conditional, so numeric indices would shift). */
export type TripTourKey =
    | 'mode'
    | 'destination'
    | 'dates'
    | 'budget'
    | 'organizers'
    | 'participants'
    | 'itinerary';

export interface TripTourProps {
    /** Drive whether the tour is currently running. The parent owns
     *  this state so it can be flipped by both the auto-trigger and
     *  the manual "Take the tour" button. */
    run: boolean;
    /** Which create-flow screen is currently visible. Drives the tooltip
     *  set so the tour shows screen-relevant guidance. */
    tourKey: TripTourKey;
    /** Called when the tour finishes, the user skips, or the user
     *  closes the tooltip. Parent should set `run=false` here and
     *  (typically) mark the tour as completed in localStorage. */
    onClose: () => void;
}

const MODE_STEPS: Step[] = [
    {
        target: 'body',
        placement: 'center',
        title: 'Plan your first trip',
        content: (
            <p>
                We'll ask one quick thing per screen and you tap{' '}
                <strong>Next</strong> to move on. Hit{' '}
                <strong>Take the tour</strong> again on any screen if
                you want a refresher.
            </p>
        ),
    },
    {
        target: '.trip-mode-cards',
        title: 'Single or multi-destination?',
        content: (
            <p>
                <strong>Single</strong> for one country, one window of
                dates. <strong>Multi</strong> for hopping across
                several. Switch later if your plans change.
            </p>
        ),
    },
    {
        target: '[data-tour="trip-next-btn"]',
        title: 'Tap Next',
        content: (
            <p>
                Once you've picked, tap <strong>Next</strong> to keep
                going.
            </p>
        ),
    },
];

const DESTINATION_STEPS: Step[] = [
    {
        target: '[data-tour="trip-destination"]',
        title: 'Where are you going?',
        content: (
            <p>
                Start typing a country and pick from the suggestions.
                The trip name auto-fills — you can rename anytime.
            </p>
        ),
    },
];

const DATES_STEPS: Step[] = [
    {
        target: '[data-tour="trip-dates"]',
        title: 'When are you going?',
        content: (
            <p>
                Set your start and end dates. We'll work out the night
                count and pre-build an empty itinerary day for each
                date in the range.
            </p>
        ),
    },
];

const BUDGET_STEPS: Step[] = [
    {
        target: '[data-tour="trip-budget"]',
        title: "What's your budget?",
        content: (
            <p>
                A rough total works — you'll split it per activity
                later. Use <strong>0</strong> if you'd rather not
                track spend at all.
            </p>
        ),
    },
];

const ORGANIZER_STEPS: Step[] = [
    {
        target: '[data-tour="trip-organizers"]',
        title: 'Organizers can edit',
        content: (
            <p>
                You're added automatically. Add co-organizers if
                someone else should be able to change the trip — dates,
                places, budget, etc.
            </p>
        ),
    },
];

const PARTICIPANT_STEPS: Step[] = [
    {
        target: '[data-tour="trip-participants"]',
        title: 'Participants come along',
        content: (
            <p>
                Add the people you're traveling with. They can be
                tagged on activities and you can split budgets between
                them later in the Itinerary step. Going solo? Just hit
                Next.
            </p>
        ),
    },
];

const ITINERARY_STEPS: Step[] = [
    {
        target: 'body',
        placement: 'center',
        title: 'Build your itinerary',
        content: (
            <p>
                Each day in your trip range becomes a slot you can
                fill with <strong>places</strong>, <strong>flights</strong>
                , <strong>hotel check-ins</strong>, or just{' '}
                <strong>notes</strong>. Don't try to fill everything
                — empty days are fine too.
            </p>
        ),
    },
    {
        target: '[data-tour="trip-day-header"]',
        title: 'One row per day',
        content: (
            <p>
                Each date in your trip gets its own row. Activities
                added to a day are auto-sorted by start time so the
                day reads top-to-bottom in chronological order.
            </p>
        ),
    },
    {
        target: '[data-tour="trip-add-activity"]',
        title: 'Add an activity',
        content: (
            <p>
                Tap <strong>Add</strong> to insert a place,
                restaurant, flight, hotel check-in, or a free-form
                note. You can edit, reorder, or delete any activity
                later. Cancelling the form discards your changes —
                nothing is saved until you hit <strong>Finish</strong>
                .
            </p>
        ),
    },
    {
        target: '[data-tour="trip-next-btn"]',
        title: 'Save your trip',
        content: (
            <p>
                When you're ready, click <strong>Finish</strong>.
                We'll save the trip and notify any participants you
                added on step 2. After saving you can mark activities
                as <strong>Confirmed</strong> or{' '}
                <strong>Completed</strong> from the trip detail page.
            </p>
        ),
    },
];

const STEPS_BY_KEY: Record<TripTourKey, Step[]> = {
    mode: MODE_STEPS,
    destination: DESTINATION_STEPS,
    dates: DATES_STEPS,
    budget: BUDGET_STEPS,
    organizers: ORGANIZER_STEPS,
    participants: PARTICIPANT_STEPS,
    itinerary: ITINERARY_STEPS,
};

const TripTour = ({ run, tourKey, onClose }: TripTourProps) => {
    const steps = useMemo(() => STEPS_BY_KEY[tourKey] ?? [], [tourKey]);

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
            // Reset the run cycle when the screen changes so a mid-tour
            // Next click on the wizard doesn't strand Joyride pointing at
            // an unmounted target. The key bump forces a fresh mount with
            // the new screen's step list.
            key={`tour-${tourKey}`}
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
                    // Wider + slightly more padding so the body copy
                    // doesn't break in awkward places (e.g. "on the
                    // next step if you want a refresher" landing on a
                    // line by itself at maxWidth=380). 460 fits two
                    // comfortable lines of the longest tour message
                    // and still feels like a tooltip, not a modal.
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

export default TripTour;
