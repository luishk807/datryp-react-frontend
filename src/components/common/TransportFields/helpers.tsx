import moment from 'moment';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { FlightInfo, TransitInfo } from 'types';

/** "DEP → ARR" route string for a flight leg, or '' when neither airport is
 *  set. Uppercases the IATA codes. */
export const flightRoute = (seg: FlightInfo): string => {
    const dep = seg.departAirport?.trim().toUpperCase();
    const arr = seg.arrivalAirport?.trim().toUpperCase();
    if (dep || arr) return `${dep || '—'} → ${arr || '—'}`;
    return '';
};

/** "Jun 15 · 10:30 AM → 3:20 PM" — the leg's schedule for the collapsed
 *  header. Date shows once (depart date); the two times bracket the arrow.
 *  Returns '' when nothing schedulable is set. */
export const flightSchedule = (seg: FlightInfo): string => {
    const day = seg.departDate
        ? moment(seg.departDate, 'YYYY-MM-DD').format('MMM D')
        : '';
    const fmtTime = (t?: string) =>
        t ? moment(t, 'HH:mm').format('h:mm A') : '';
    const dep = fmtTime(seg.departTime);
    const arr = fmtTime(seg.arrivalTime);
    const times = dep || arr ? `${dep || '—'} → ${arr || '—'}` : '';
    return [day, times].filter(Boolean).join(' · ');
};

/** "FROM → TO" route string for a transit leg, or '' when neither station is
 *  set. Mirrors `flightRoute` but keeps the user's casing (station names, not
 *  IATA codes). */
export const transitRoute = (seg: TransitInfo): string => {
    const dep = seg.departStation?.trim();
    const arr = seg.arrivalStation?.trim();
    if (dep || arr) return `${dep || '—'} → ${arr || '—'}`;
    return '';
};

/** Provider/number summary for the collapsed meta line — "Renfe 3152", or
 *  just one side when only one is set. '' when neither is present. */
export const transitOperatorLine = (seg: TransitInfo): string =>
    [seg.operator?.trim(), seg.number?.trim()].filter(Boolean).join(' ');

/** "Jun 15 · 10:30 AM → 3:20 PM" — the leg's schedule for the collapsed
 *  header (depart date once, the two times bracketing the arrow). Shares the
 *  shape of `flightSchedule`. */
export const transitSchedule = (seg: TransitInfo): string => {
    const day = seg.departDate
        ? moment(seg.departDate, 'YYYY-MM-DD').format('MMM D')
        : '';
    const fmtTime = (t?: string) =>
        t ? moment(t, 'HH:mm').format('h:mm A') : '';
    const dep = fmtTime(seg.departTime);
    const arr = fmtTime(seg.arrivalTime);
    const times = dep || arr ? `${dep || '—'} → ${arr || '—'}` : '';
    return [day, times].filter(Boolean).join(' · ');
};

/** Combine the model's separate `date` (YYYY-MM-DD) + `time` (HH:mm) strings
 *  into a single moment for the DateTimePicker. Returns null when neither is
 *  set so an unfilled control renders blank (not today). */
export const toDateTime = (
    date?: string,
    time?: string,
): moment.Moment | null => {
    if (!date && !time) return null;
    const m = moment(
        `${date || moment().format('YYYY-MM-DD')} ${time || '00:00'}`,
        'YYYY-MM-DD HH:mm',
    );
    return m.isValid() ? m : null;
};

export interface DateTimeFieldProps {
    label: string;
    value: moment.Moment | null;
    minDate?: string;
    maxDate?: string;
    /** Splits the combined value back into the model's date + time strings.
     *  Empty `date`/`time` when the picker is cleared. */
    onChange: (date: string, time: string) => void;
}

/** A single date+time control that writes back to the two separate model
 *  fields — used for both the depart and arrival rows in Schedule. */
export const DateTimeField = ({
    label,
    value,
    minDate,
    maxDate,
    onChange,
}: DateTimeFieldProps) => (
    <div className="add-destination-field transit-datetime">
        <label className="add-destination-label">{label}</label>
        <DateTimePicker
            value={value}
            onChange={(m) =>
                m && m.isValid()
                    ? onChange(m.format('YYYY-MM-DD'), m.format('HH:mm'))
                    : onChange('', '')
            }
            {...(minDate ? { minDate: moment(minDate) } : {})}
            {...(maxDate ? { maxDate: moment(maxDate) } : {})}
        />
    </div>
);
