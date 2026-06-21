/**
 * Manual-only walkthrough of the homepage's three ways to start a
 * trip: Search by Place, Search by Interest, and the "Plan my trip
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
import { Trans, useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const steps = useMemo<Step[]>(
        () => [
            {
                target: 'body',
                placement: 'center',
                title: t('homeCards.homeTour.steps.intro.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="homeCards.homeTour.steps.intro.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '[data-tour="home-search-place"]',
                placement: 'bottom',
                title: t('homeCards.homeTour.steps.place.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="homeCards.homeTour.steps.place.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '[data-tour="home-search-describe"]',
                placement: 'bottom',
                title: t('homeCards.homeTour.steps.describe.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="homeCards.homeTour.steps.describe.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '[data-tour="home-searchbar"]',
                placement: 'bottom',
                title: t('homeCards.homeTour.steps.searchbar.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="homeCards.homeTour.steps.searchbar.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '[data-tour="home-ai-cta"]',
                placement: 'top',
                title: t('homeCards.homeTour.steps.ai.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="homeCards.homeTour.steps.ai.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
        ],
        [t]
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
                back: t('homeCards.homeTour.locale.back'),
                close: t('homeCards.homeTour.locale.close'),
                last: t('homeCards.homeTour.locale.last'),
                next: t('homeCards.homeTour.locale.next'),
                skip: t('homeCards.homeTour.locale.skip'),
            }}
            onEvent={handleEvent}
        />
    );
};

export default HomeTour;
