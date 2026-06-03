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
            <h2 className="trip-step-headline">When are you going?</h2>
            <p className="trip-step-sub">
                Set your start and end dates — we'll build an empty day for
                each date in the range.
            </p>

            <div className="trip-step-card">
                <div className="trip-dates-grid">
                    <div className="trip-step-field">
                        <label className="trip-step-label">
                            <EventOutlinedIcon /> Starts
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
                            <EventOutlinedIcon /> Ends
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
                        End date can&rsquo;t be before the start date.
                    </p>
                ) : (
                    nights !== null && (
                        <p className="trip-dates-summary">
                            {nights === 0
                                ? 'Day trip.'
                                : `${nights} night${nights === 1 ? '' : 's'} on the road.`}
                        </p>
                    )
                )}
            </div>
        </div>
    );
};

export default DatesStep;
