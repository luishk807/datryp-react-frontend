import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import moment, { type Moment } from 'moment';
import { useTranslation } from 'react-i18next';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import './index.scss';

export interface SheetDatePickerProps {
    /** Current date as "YYYY-MM-DD". Empty = unset. */
    value?: string;
    /** Emits the chosen date as "YYYY-MM-DD" on Done. */
    onChange: (value: string) => void;
    /** Accessible name for the trigger (the visible label is rendered by the
     *  parent FormControl for date fields). */
    label?: string | null;
    disabled?: boolean;
    minDate?: string;
    maxDate?: string;
    disablePast?: boolean;
}

const FMT = 'YYYY-MM-DD';
const MONTH_KEY = 'YYYY-MM';
const MAX_MONTHS = 36; // safety cap when there's no upper bound
const DEFAULT_SPAN = 14; // months shown ahead when maxDate is open-ended

const toMoment = (v?: string): Moment | null =>
    v && moment(v, FMT, true).isValid() ? moment(v, FMT) : null;

const SheetDatePicker = ({
    value,
    onChange,
    label,
    disabled = false,
    minDate,
    maxDate,
    disablePast = false,
}: SheetDatePickerProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const selected = toMoment(value);
    const [draft, setDraft] = useState(selected ? selected.format(FMT) : '');

    const bodyRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<HTMLElement | null>(null);

    const lowerBound = useMemo(() => {
        const bounds: Moment[] = [];
        if (disablePast) bounds.push(moment().startOf('day'));
        const min = toMoment(minDate);
        if (min) bounds.push(min.startOf('day'));
        return bounds.length ? moment.max(bounds) : null;
    }, [disablePast, minDate]);

    const upperBound = useMemo(() => {
        const max = toMoment(maxDate);
        return max ? max.endOf('day') : null;
    }, [maxDate]);

    // Consecutive months to render, from the first allowed month through the
    // upper bound (or a default span). Anchored on bounds/value only so tapping
    // a day doesn't rebuild the list.
    const months = useMemo(() => {
        const start = (lowerBound ? lowerBound.clone() : moment()).startOf('month');
        let end = upperBound
            ? upperBound.clone().startOf('month')
            : start.clone().add(DEFAULT_SPAN, 'month');
        const anchor = toMoment(value);
        if (anchor && anchor.isAfter(end, 'month')) end = anchor.clone().startOf('month');
        const out: Moment[] = [];
        const cursor = start.clone();
        while (cursor.isSameOrBefore(end, 'month') && out.length < MAX_MONTHS) {
            out.push(cursor.clone());
            cursor.add(1, 'month');
        }
        return out;
    }, [lowerBound, upperBound, value]);

    const scrollToKey = (toMoment(value) ?? moment()).format(MONTH_KEY);

    const openSheet = () => {
        if (disabled) return;
        const cur = toMoment(value);
        setDraft(cur ? cur.format(FMT) : '');
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // Jump to the month holding the current value (or today).
        const raf = requestAnimationFrame(() => {
            if (bodyRef.current && targetRef.current) {
                bodyRef.current.scrollTop = targetRef.current.offsetTop;
            }
        });
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            cancelAnimationFrame(raf);
        };
    }, [open]);

    const isDisabledDay = (d: Moment) =>
        (!!lowerBound && d.isBefore(lowerBound, 'day')) ||
        (!!upperBound && d.isAfter(upperBound, 'day'));

    const commit = () => {
        if (draft) onChange(draft);
        setOpen(false);
    };

    const display = selected ? selected.format('ddd, MMM D') : null;
    const draftMoment = toMoment(draft);
    const todayIso = moment().format(FMT);
    const weekdays = moment.weekdaysMin(); // localized, Sunday-first

    const renderMonth = (m: Moment) => {
        const start = m.clone().startOf('month');
        const offset = start.day(); // 0 (Sun) .. 6 (Sat)
        const total = start.daysInMonth();
        const cells: (Moment | null)[] = [];
        for (let i = 0; i < offset; i++) cells.push(null);
        for (let d = 1; d <= total; d++) cells.push(start.clone().date(d));
        while (cells.length % 7 !== 0) cells.push(null);
        const key = m.format(MONTH_KEY);
        return (
            <section
                key={key}
                className="sdp-month"
                ref={
                    key === scrollToKey
                        ? (el) => {
                              targetRef.current = el;
                          }
                        : undefined
                }
            >
                <h4 className="sdp-month-title">{m.format('MMMM YYYY')}</h4>
                <div className="sdp-grid sdp-days" role="grid">
                    {cells.map((d, i) => {
                        if (!d)
                            return <span key={`e-${i}`} className="sdp-cell is-empty" />;
                        const iso = d.format(FMT);
                        const off = isDisabledDay(d);
                        return (
                            <button
                                key={iso}
                                type="button"
                                className={classNames('sdp-cell', {
                                    'is-selected': iso === draft,
                                    'is-today': iso === todayIso,
                                    'is-disabled': off,
                                })}
                                disabled={off}
                                aria-pressed={iso === draft}
                                onClick={() => setDraft(iso)}
                            >
                                {d.date()}
                            </button>
                        );
                    })}
                </div>
            </section>
        );
    };

    return (
        <div className={classNames('sdp', { 'is-disabled': disabled })}>
            <button
                type="button"
                className="sdp-trigger"
                onClick={openSheet}
                disabled={disabled}
                aria-label={typeof label === 'string' && label ? label : undefined}
            >
                <span className={classNames('sdp-value', { 'is-placeholder': !display })}>
                    {display ?? t('datePicker.select', 'Select date')}
                </span>
                <CalendarTodayRoundedIcon className="sdp-icon" fontSize="small" />
            </button>

            {open &&
                createPortal(
                    <div
                        className="sdp-sheet-root"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('datePicker.select', 'Select date')}
                    >
                        <button
                            type="button"
                            className="sdp-backdrop"
                            aria-label={t('datePicker.close', 'Close')}
                            onClick={() => setOpen(false)}
                        />
                        <div className="sdp-sheet">
                            <div className="sdp-head">
                                <button
                                    type="button"
                                    className="sdp-x"
                                    onClick={() => setOpen(false)}
                                    aria-label={t('datePicker.close', 'Close')}
                                >
                                    ✕
                                </button>
                                <span className="sdp-title">
                                    {t('datePicker.select', 'Select date')}
                                </span>
                            </div>

                            <div className="sdp-weekdays" aria-hidden="true">
                                {weekdays.map((w, i) => (
                                    <span key={`${w}-${i}`} className="sdp-wd">
                                        {w}
                                    </span>
                                ))}
                            </div>

                            <div className="sdp-body" ref={bodyRef}>
                                {months.map(renderMonth)}
                            </div>

                            <div className="sdp-foot">
                                <span className="sdp-foot-sel">
                                    {draftMoment
                                        ? draftMoment.format('ddd, MMM D, YYYY')
                                        : t('datePicker.pickDay', 'Pick a day')}
                                </span>
                                <button
                                    type="button"
                                    className="sdp-done"
                                    onClick={commit}
                                    disabled={!draft}
                                >
                                    {t('datePicker.done', 'Done')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default SheetDatePicker;
