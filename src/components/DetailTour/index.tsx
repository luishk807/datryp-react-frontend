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

const KIND_NOUN: Record<DetailTourKind, string> = {
    country: 'country',
    city: 'city',
    place: 'place',
};

const DetailTour = ({ kind }: DetailTourProps) => {
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
        const noun = KIND_NOUN[kind];
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
                      title: 'Add it to a trip',
                      content: (
                          <p>
                              Tap <strong>Add to itinerary</strong> to drop
                              this place straight onto a day in one of your
                              trips — no retyping.
                          </p>
                      ),
                  }
                : {
                      target: ctaTarget,
                      placement: 'bottom',
                      title: 'Start planning',
                      content: (
                          <p>
                              When you're ready, hit{' '}
                              <strong>Start planning</strong> — we'll turn
                              this {noun} into a trip with the destination
                              pre-filled so you can jump straight to the
                              itinerary.
                          </p>
                      ),
                  };

        return [
            {
                target: 'body',
                placement: 'center',
                title: 'Welcome to the guide',
                content: (
                    <p>
                        This is the {noun} guide — weather, costs, safety,
                        things to do, and more. First, a quick look at the
                        icons up top.
                    </p>
                ),
            },
            {
                target: `.${kind}-detail-overlay-actions`,
                placement: 'bottom',
                title: 'Your quick actions',
                content: (
                    <>
                        <p>These icons let you keep track of places:</p>
                        <ul className="detail-tour-legend">
                            <li>
                                <FavoriteBorderRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <strong>Save</strong> — bookmark it to
                                    your Saved list to come back to later.
                                </span>
                            </li>
                            <li>
                                <CheckCircleOutlineRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <strong>Visited</strong> — mark you've
                                    been here; it shows up on your travel
                                    map.
                                </span>
                            </li>
                            <li>
                                <ChecklistRoundedIcon className="detail-tour-legend-icon" />
                                <span>
                                    <strong>Bucket list</strong> — add it to
                                    your someday-travel wishlist.
                                </span>
                            </li>
                            <li>
                                <IosShareIcon className="detail-tour-legend-icon" />
                                <span>
                                    <strong>Share</strong> — send it via
                                    WhatsApp or email, or copy the link.
                                </span>
                            </li>
                        </ul>
                    </>
                ),
            },
            ctaStep,
        ];
    }, [kind]);

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

export default DetailTour;
