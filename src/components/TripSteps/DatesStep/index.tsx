import { useTranslation } from 'react-i18next';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import InputField from 'components/common/FormFields/InputField';
import type { TripChangeEvent, TripState } from 'types';
import './index.scss';

interface DatesStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

/** Step 3 — start/end dates. The reducer re-anchors any seeded outbound
 *  flight onto the start date when the range changes, so we don't need a
 *  custom end-date handler anymore (we used to relocate a seeded return
 *  leg here, but return flights are no longer auto-seeded). */
const DatesStep = ({ data, onChange }: DatesStepProps) => {
    const { t } = useTranslation();
    const start = data?.startDate ?? '';
    const end = data?.endDate ?? '';

    const dayDiff = (() => {
        if (!start || !end) return null;
        const a = new Date(start);
        const b = new Date(end);
        const diff = Math.round(
            (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Number.isFinite(diff) ? diff : null;
    })();

    // End before start is invalid in either direction — the user either
    // pushed the start past the end or pulled the end before the start.
    // Surfaced here AND gated in StepperComp (Next is disabled), so the
    // wizard can't advance with a backwards range.
    const isInvalidRange = dayDiff !== null && dayDiff < 0;
    const nights = dayDiff !== null && dayDiff >= 0 ? dayDiff : null;

    return (
        <div
            className="trip-step-screen trip-dates-step"
            data-tour="trip-dates"
        >
            <h2 className="trip-step-headline">
                {t('createTrip.dates.title')}
            </h2>
            <p className="trip-step-sub">{t('createTrip.dates.subtitle')}</p>

            <div className="trip-step-card">
                <div className="trip-dates-grid">
                    <div className="trip-step-field">
                        <label className="trip-step-label">
                            <EventOutlinedIcon />{' '}
                            {t('createTrip.dates.starts')}
                        </label>
                        <InputField
                            value={start}
                            name="startDate"
                            type="date"
                            onChange={(e) => onChange('startDate', e)}
                        />
                    </div>
                    <div className="trip-step-field">
                        <label className="trip-step-label">
                            <EventOutlinedIcon /> {t('createTrip.dates.ends')}
                        </label>
                        <InputField
                            value={end}
                            name="endDate"
                            type="date"
                            onChange={(e) => onChange('endDate', e)}
                        />
                    </div>
                </div>
                {isInvalidRange ? (
                    <p className="trip-dates-error" role="alert">
                        {t('createTrip.dates.invalidRange')}
                    </p>
                ) : (
                    nights !== null && (
                        <p className="trip-dates-summary">
                            {nights === 0
                                ? t('createTrip.dates.dayTrip')
                                : t('createTrip.dates.nights', {
                                      count: nights,
                                  })}
                        </p>
                    )
                )}
            </div>
        </div>
    );
};

export default DatesStep;
