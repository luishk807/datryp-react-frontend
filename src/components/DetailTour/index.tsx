/**
 * First-visit walkthrough for the country / city / place detail pages.
 * These pages share a hero action cluster (Save / Visited / Bucket list /
 * Share) plus a primary CTA, and nothing on the page explains what the
 * icons do — so this tour points them out the first time a user lands on
 * ANY of the three.
 *
 * Self-contained: it owns its run-state and auto-runs once per browser
 * (localStorage `detail-tour-completed-v1`, shared across all three page
 * kinds — teach the icons once, not three times). Each page just renders
 * `<DetailTour kind="country" />` inside its loaded branch, where the
 * anchored elements already exist in the DOM.
 *
 * react-joyride v3 skips any step whose target isn't mounted, so a markup
 * change can't stall the tour — the affected step just no-ops. Shares
 * TripTour's tooltip polish (top accent stripe, hover states).
 */
import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
    Joyride,
    EVENTS,
    STATUS,
    type EventData,
    type Step,
} from 'react-joyride';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import IosShareIcon from '@mui/icons-material/IosShare';
import 'components/TripTour/index.scss';
import './index.scss';

export const DETAIL_TOUR_STORAGE_KEY = 'detail-tour-completed-v1';

export type DetailTourKind = 'country' | 'city' | 'place';

export interface DetailTourProps {
    /** Which detail page this is — drives the anchor selectors and the
     *  CTA copy. */
    kind: DetailTourKind;
}

const KIND_NOUN_KEY: Record<DetailTourKind, string> = {
    country: 'detail.tour.nounCountry',
    city: 'detail.tour.nounCity',
    place: 'detail.tour.nounPlace',
};

const DetailTour = ({ kind }: DetailTourProps) => {
    const { t } = useTranslation();
    const [run, setRun] = useState(false);

    // Auto-run once per browser. The 600ms delay lets the hero + action
    // chips paint so Joyride has real targets to anchor to.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.localStorage.getItem(DETAIL_TOUR_STORAGE_KEY) === '1') {
            return;
        }
        const handle = window.setTimeout(() => setRun(true), 600);
        return () => window.clearTimeout(handle);
    }, []);

    const handleClose = () => {
        setRun(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(DETAIL_TOUR_STORAGE_KEY, '1');
        }
    };

    const steps = useMemo<Step[]>(() => {
        const noun = t(KIND_NOUN_KEY[kind]);
        // Country/city offer a "Start planning" CTA; place offers
        // "Add to itinerary" — different element, different copy.
        const ctaTarget =
            kind === 'place'
                ? '.add-itinerary-pill'
                : `.${kind}-detail-plan-cta`;
        const ctaStep: Step =
            kind === 'place'
                ? {
                      target: ctaTarget,
                      placement: 'bottom',
                      title: t('detail.tour.ctaPlaceTitle'),
                      content: (
                          <p>
                              <Trans
                                  i18nKey="detail.tour.ctaPlaceBody"
                                  components={{ strong: <strong /> }}
                              />
                          </p>
                      ),
                  }
                : {
                      target: ctaTarget,
                      placement: 'bottom',
                      title: t('detail.tour.ctaPlanTitle'),
                      content: (
                          <p>
                              <Trans
                                  i18nKey="detail.tour.ctaPlanBody"
                                  values={{ kind: noun }}
                                  components={{ strong: <strong /> }}
                              />
                          </p>
                      ),
                  };

        return [
            {
                target: 'body',
                placement: 'center',
                title: t('detail.tour.welcomeTitle'),
                content: <p>{t('detail.tour.welcomeBody', { kind: noun })}</p>,
            },
            {
                target: `.${kind}-detail-overlay-actions`,
                placement: 'bottom',
                title: t('detail.tour.actionsTitle'),
                content: (
                    <>
                        <p>{t('detail.tour.actionsIntro')}</p>
                        <ul className="detail-tour-legend">
                            <li>
                                <FavoriteBorderRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <Trans
                                        i18nKey="detail.tour.saveItem"
                                        components={{ strong: <strong /> }}
                                    />
                                </span>
                            </li>
                            <li>
                                <CheckCircleOutlineRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <Trans
                                        i18nKey="detail.tour.visitedItem"
                                        components={{ strong: <strong /> }}
                                    />
                                </span>
                            </li>
                            <li>
                                <ChecklistRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <Trans
                                        i18nKey="detail.tour.bucketItem"
                                        components={{ strong: <strong /> }}
                                    />
                                </span>
                            </li>
                            <li>
                                <IosShareIcon className="detail-tour-legend-icon" />
                                <span>
                                    <Trans
                                        i18nKey="detail.tour.shareItem"
                                        components={{ strong: <strong /> }}
                                    />
                                </span>
                            </li>
                        </ul>
                    </>
                ),
            },
            ctaStep,
        ];
    }, [kind, t]);

    const handleEvent = (data: EventData) => {
        if (
            data.status === STATUS.FINISHED ||
            data.status === STATUS.SKIPPED ||
            data.type === EVENTS.TOUR_END
        ) {
            handleClose();
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
                back: t('detail.tour.back'),
                close: t('detail.tour.close'),
                last: t('detail.tour.gotIt'),
                next: t('detail.tour.next'),
                skip: t('detail.tour.skip'),
            }}
            onEvent={handleEvent}
        />
    );
};

export default DetailTour;
