import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import InputField from 'components/common/FormFields/InputField';
import type { TripChangeEvent, TripState } from 'types';
import './index.scss';

interface DatesStepProps {
    data: TripState | undefined;
    onChange: (id: string, e: TripChangeEvent) => void;
}

const DatesStep = ({ data, onChange }: DatesStepProps) => {
    // Use the controlled `value` path so empty strings render as an empty
    // picker. Passing `defaultValue=""` would fall back to `moment()`
    // (today) inside InputField and silently seed today's date.
    const start = data?.startDate ?? '';
    const end = data?.endDate ?? '';
    const nights = (() => {
        if (!start || !end) return null;
        const a = new Date(start);
        const b = new Date(end);
        const diff = Math.round(
            (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Number.isFinite(diff) && diff >= 0 ? diff : null;
    })();

    return (
        <div className="trip-dates-step">
            <h2 className="trip-step-headline">When are you going?</h2>
            <p className="trip-step-sub">
                Pick a start and end date. You can fine-tune individual days
                later.
            </p>

            <div className="trip-dates-grid">
                <div className="trip-dates-field">
                    <label className="trip-dates-label">
                        <EventOutlinedIcon /> Starts
                    </label>
                    <InputField
                        value={start}
                        name="startDate"
                        type="date"
                        onChange={(e) => onChange('startDate', e)}
                    />
                </div>
                <div className="trip-dates-field">
                    <label className="trip-dates-label">
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
            {nights !== null && (
                <p className="trip-dates-summary">
                    {nights === 0
                        ? 'Day trip.'
                        : `${nights} night${nights === 1 ? '' : 's'} on the road.`}
                </p>
            )}
        </div>
    );
};

export default DatesStep;
