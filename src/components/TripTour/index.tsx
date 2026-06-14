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
import { Trans, useTranslation } from 'react-i18next';
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

/** Targets per screen, paired with the `tripDetail.tripTour` subkey that
 *  holds each step's `title` + `content`. Steps that carry `<strong>` markup
 *  render their content via <Trans>; the few plain-text ones use t() directly. */
const STEP_TARGETS: Record<
    TripTourKey,
    { target: string; key: string; placement?: Step['placement'] }[]
> = {
    mode: [
        { target: 'body', placement: 'center', key: 'mode.intro' },
        { target: '.trip-mode-cards', key: 'mode.singleOrMulti' },
        { target: '[data-tour="trip-next-btn"]', key: 'mode.tapNext' },
    ],
    destination: [
        { target: '[data-tour="trip-destination"]', key: 'destination.where' },
    ],
    dates: [{ target: '[data-tour="trip-dates"]', key: 'dates.when' }],
    budget: [{ target: '[data-tour="trip-budget"]', key: 'budget.budget' }],
    organizers: [
        { target: '[data-tour="trip-organizers"]', key: 'organizers.canEdit' },
    ],
    participants: [
        {
            target: '[data-tour="trip-participants"]',
            key: 'participants.comeAlong',
        },
    ],
    itinerary: [
        { target: 'body', placement: 'center', key: 'itinerary.build' },
        { target: '[data-tour="trip-day-header"]', key: 'itinerary.oneRow' },
        { target: '[data-tour="trip-add-activity"]', key: 'itinerary.addActivity' },
        { target: '[data-tour="trip-next-btn"]', key: 'itinerary.save' },
    ],
};

const TripTour = ({ run, tourKey, onClose }: TripTourProps) => {
    const { t } = useTranslation();
    const steps = useMemo<Step[]>(
        () =>
            (STEP_TARGETS[tourKey] ?? []).map((s) => ({
                target: s.target,
                ...(s.placement ? { placement: s.placement } : {}),
                title: t(`tripDetail.tripTour.${s.key}.title`),
                content: (
                    <p>
                        <Trans
                            i18nKey={`tripDetail.tripTour.${s.key}.content`}
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            })),
        [tourKey, t]
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
                back: t('tripDetail.tripTour.locale.back'),
                close: t('tripDetail.tripTour.locale.close'),
                last: t('tripDetail.tripTour.locale.last'),
                next: t('tripDetail.tripTour.locale.next'),
                skip: t('tripDetail.tripTour.locale.skip'),
            }}
            onEvent={handleEvent}
        />
    );
};

export default TripTour;
