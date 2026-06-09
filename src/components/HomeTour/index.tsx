/**
 * Manual-only walkthrough of the homepage's three ways to start a
 * trip: Search by Place, Search by Description, and the "Plan my trip
 * for me" AI builder. Unlike the create-trip and trip-detail tours,
 * this one never auto-runs — it's launched on demand from the
 * "How Datryp works" help link under the hero search box, which flips
 * Home's `run` state directly.
 *
 * Anchors target stable `data-tour` attributes on the hero markup.
 * react-joyride v3 skips any step whose target isn't mounted, so a
 * markup change can't stall the tour — the affected step just no-ops.
 *
 * Shares TripTour's tooltip polish (top accent stripe, hover states).
 */
import { useMemo } from 'react';
import {
    Joyride,
    EVENTS,
    STATUS,
    type EventData,
    type Step,
} from 'react-joyride';
import 'components/TripTour/index.scss';

export interface HomeTourProps {
    /** Parent owns run-state so the header-menu trigger (via `?tour=1`)
     *  and the tour's own finish/skip can both flip it. */
    run: boolean;
    /** Fired on finish / skip / close — parent sets `run=false`. */
    onClose: () => void;
}

const HomeTour = ({ run, onClose }: HomeTourProps) => {
    const steps = useMemo<Step[]>(
        () => [
            {
                target: 'body',
                placement: 'center',
                title: 'Three ways to start',
                content: (
                    <p>
                        However you like to plan, there's a starting
                        point here. Let's take a quick look — under a
                        minute.
                    </p>
                ),
            },
            {
                target: '[data-tour="home-search-place"]',
                placement: 'bottom',
                title: 'Search by Place',
                content: (
                    <p>
                        Know where you're headed? Pick{' '}
                        <strong>Search by Place</strong>, then type a
                        country or city. We'll open its guide so you can
                        start a trip there.
                    </p>
                ),
            },
            {
                target: '[data-tour="home-search-describe"]',
                placement: 'bottom',
                title: 'Search by Description',
                content: (
                    <p>
                        Not tied to one spot? Switch to{' '}
                        <strong>Search by Description</strong> and
                        describe the vibe — "warm beaches in December,"
                        "cheap food cities" — and we'll suggest matching
                        places.
                    </p>
                ),
            },
            {
                target: '[data-tour="home-searchbar"]',
                placement: 'bottom',
                title: 'One search box',
                content: (
                    <p>
                        The box adapts to the mode you picked above —
                        place names when searching by place, a free-text
                        prompt when searching by description.
                    </p>
                ),
            },
            {
                target: '[data-tour="home-ai-cta"]',
                placement: 'top',
                title: 'Let us plan it for you',
                content: (
                    <p>
                        Totally undecided? Tap{' '}
                        <strong>Plan my trip for me</strong> — we’ll ask a
                        few quick questions, then draft a full itinerary you
                        can tweak. (Pro feature.)
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

export default HomeTour;
