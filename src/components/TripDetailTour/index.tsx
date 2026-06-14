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
import { Trans, useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const steps = useMemo<Step[]>(
        () => [
            {
                target: 'body',
                placement: 'center',
                title: t('tripDetail.tour.saved.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.saved.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-header',
                placement: 'bottom',
                title: t('tripDetail.tour.lifecycle.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.lifecycle.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-actions-left .trip-detail-basic-info-toggle',
                placement: 'bottom',
                title: t('tripDetail.tour.details.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.details.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-focusmode-toggle',
                placement: 'bottom',
                title: t('tripDetail.tour.focus.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.focus.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-night-toggle',
                placement: 'bottom',
                title: t('tripDetail.tour.night.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.night.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-textonly-toggle',
                placement: 'bottom',
                title: t('tripDetail.tour.textOnly.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.textOnly.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-offline-download-wrap',
                placement: 'bottom',
                title: t('tripDetail.tour.offline.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.offline.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.trip-detail-download-btn',
                placement: 'bottom',
                title: t('tripDetail.tour.share.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.share.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.notify-participants-checkbox',
                placement: 'bottom',
                title: t('tripDetail.tour.quietEdits.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.quietEdits.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.date-block',
                placement: 'bottom',
                title: t('tripDetail.tour.timeline.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.timeline.content"
                            components={{ strong: <strong /> }}
                        />
                    </p>
                ),
            },
            {
                target: '.activity-content-trip',
                placement: 'top',
                title: t('tripDetail.tour.activityStatus.title'),
                content: (
                    <p>
                        <Trans
                            i18nKey="tripDetail.tour.activityStatus.content"
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
                back: t('tripDetail.tour.locale.back'),
                close: t('tripDetail.tour.locale.close'),
                last: t('tripDetail.tour.locale.last'),
                next: t('tripDetail.tour.locale.next'),
                skip: t('tripDetail.tour.locale.skip'),
            }}
            onEvent={handleEvent}
        />
    );
};

export default TripDetailTour;
