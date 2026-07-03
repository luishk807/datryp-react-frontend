import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import './index.scss';

export interface WheelTimePickerProps {
    /** Current time as "HH:mm" (24-hour). Empty string = unset. */
    value?: string;
    /** Emits the picked time as "HH:mm" (24-hour) when the user taps Done. */
    onChange: (value: string) => void;
    /** Floating label on the trigger; null/empty renders no label. */
    label?: string | null;
    disabled?: boolean;
}

const ITEM_H = 40; // px per wheel row — must match .wtp-wheel-item height in scss

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface TimeParts {
    h12: number; // 1..12
    min: number; // 0..59
    pm: boolean;
}

const parse = (hhmm?: string): TimeParts | null => {
    if (!hhmm) return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return { h12: ((h + 11) % 12) + 1, min, pm: h >= 12 };
};

const toHHMM = (h12: number, min: number, pm: boolean): string => {
    let h = h12 % 12;
    if (pm) h += 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

const FALLBACK: TimeParts = { h12: 9, min: 0, pm: false }; // 9:00 AM when unset

interface WheelProps {
    items: string[];
    index: number;
    onIndex: (i: number) => void;
    ariaLabel: string;
    className?: string;
}

/** A single vertical scroll-snap column. Reads the centered row on scroll
 *  settle and reports it up; seeds its scroll position once on mount (the
 *  sheet remounts on every open, so this lands on the current value). */
const Wheel = ({ items, index, onIndex, ariaLabel, className }: WheelProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const settle = useRef<number | undefined>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (el) el.scrollTop = index * ITEM_H;
        // Seed once on mount only — re-syncing on every `index` change would
        // fight the user mid-scroll.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScroll = () => {
        const el = ref.current;
        if (!el) return;
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => {
            const next = Math.max(
                0,
                Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H))
            );
            if (next !== index) onIndex(next);
        }, 80);
    };

    return (
        <div
            className={classNames('wtp-wheel', className)}
            ref={ref}
            onScroll={handleScroll}
            role="listbox"
            aria-label={ariaLabel}
        >
            <ul className="wtp-wheel-list">
                {items.map((item, i) => (
                    <li
                        key={item}
                        className={classNames('wtp-wheel-item', { 'is-on': i === index })}
                        role="option"
                        aria-selected={i === index}
                        onClick={() => {
                            ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                            onIndex(i);
                        }}
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const WheelTimePicker = ({
    value,
    onChange,
    label,
    disabled = false,
}: WheelTimePickerProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const seed = parse(value) ?? FALLBACK;
    const [hourIdx, setHourIdx] = useState(seed.h12 - 1);
    const [minIdx, setMinIdx] = useState(seed.min);
    const [pmIdx, setPmIdx] = useState(seed.pm ? 1 : 0);

    const openSheet = () => {
        if (disabled) return;
        const p = parse(value) ?? FALLBACK;
        setHourIdx(p.h12 - 1);
        setMinIdx(p.min);
        setPmIdx(p.pm ? 1 : 0);
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
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    const commit = () => {
        onChange(toHHMM(hourIdx + 1, minIdx, pmIdx === 1));
        setOpen(false);
    };

    const parts = parse(value);
    const display = parts
        ? `${parts.h12}:${String(parts.min).padStart(2, '0')} ${parts.pm ? 'PM' : 'AM'}`
        : null;

    return (
        <div className={classNames('wtp', { 'is-disabled': disabled })}>
            <button
                type="button"
                className="wtp-trigger"
                onClick={openSheet}
                disabled={disabled}
            >
                {label ? <span className="wtp-label">{label}</span> : null}
                <span
                    className={classNames('wtp-value', { 'is-placeholder': !display })}
                >
                    {display ?? t('timePicker.select', 'Select time')}
                </span>
                <AccessTimeRoundedIcon className="wtp-icon" fontSize="small" />
            </button>

            {open &&
                createPortal(
                    <div className="wtp-sheet-root" role="dialog" aria-modal="true">
                        <button
                            type="button"
                            className="wtp-backdrop"
                            aria-label={t('timePicker.close', 'Close')}
                            onClick={() => setOpen(false)}
                        />
                        <div className="wtp-sheet">
                            <div className="wtp-sheet-head">
                                <button
                                    type="button"
                                    className="wtp-x"
                                    onClick={() => setOpen(false)}
                                    aria-label={t('timePicker.close', 'Close')}
                                >
                                    ✕
                                </button>
                                <span className="wtp-sheet-title">
                                    {t('timePicker.select', 'Select time')}
                                </span>
                                <button type="button" className="wtp-done" onClick={commit}>
                                    {t('timePicker.done', 'Done')}
                                </button>
                            </div>
                            <div className="wtp-wheels">
                                <div className="wtp-highlight" aria-hidden="true" />
                                <Wheel
                                    items={HOURS}
                                    index={hourIdx}
                                    onIndex={setHourIdx}
                                    ariaLabel={t('timePicker.hour', 'Hour')}
                                />
                                <span className="wtp-colon" aria-hidden="true">
                                    :
                                </span>
                                <Wheel
                                    items={MINUTES}
                                    index={minIdx}
                                    onIndex={setMinIdx}
                                    ariaLabel={t('timePicker.minute', 'Minute')}
                                />
                                <Wheel
                                    className="wtp-wheel-ampm"
                                    items={['AM', 'PM']}
                                    index={pmIdx}
                                    onIndex={setPmIdx}
                                    ariaLabel={t('timePicker.meridiem', 'AM or PM')}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default WheelTimePicker;
