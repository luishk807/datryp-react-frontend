/**
 * Phone input primitive with country dial-code picker. Backed by
 * `libphonenumber-js` for as-you-type formatting and E.164 validation.
 *
 * Storage contract: caller holds an E.164 string ("+15551234567") or
 * an empty string when the field is unset. Component parses that into
 * a country + national portion internally, formats the national
 * portion as the user types, and emits the rebuilt E.164 string via
 * onChange. Empty input → onChange('').
 *
 * Country picker is a flag + dial-code button that opens a searchable
 * popover listing every ISO-3166 country libphonenumber recognises.
 * Selecting a country preserves the typed national digits and rebuilds
 * the E.164 with the new code.
 *
 * Bare variant only — matches the Account settings form.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AsYouType,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumber,
    type CountryCode,
} from 'libphonenumber-js';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import Popover from '@mui/material/Popover';
import './index.scss';

export interface PhoneInputProps {
    /** E.164 string ("+15551234567") or "" when unset. */
    value: string;
    /** Fires with the next E.164 string, or "" when cleared. */
    onChange: (next: string) => void;
    label?: string;
    placeholder?: string;
    /** Country to start in when `value` is empty / unparseable. */
    defaultCountry?: CountryCode;
    disabled?: boolean;
}

const FLAG_OFFSET = 127397;
const countryFlag = (code: string): string =>
    code
        .toUpperCase()
        .replace(/./g, (ch) =>
            String.fromCodePoint(FLAG_OFFSET + ch.charCodeAt(0)),
        );

let displayNames: Intl.DisplayNames | null = null;
try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
    displayNames = null;
}
const countryName = (code: string): string =>
    displayNames?.of(code) ?? code;

interface CountryOption {
    code: CountryCode;
    name: string;
    callingCode: string;
}
const COUNTRY_OPTIONS: CountryOption[] = getCountries()
    .map((code) => ({
        code,
        name: countryName(code),
        callingCode: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const onlyDigits = (s: string): string => s.replace(/\D/g, '');

/** Run digits through AsYouType for the chosen country. New formatter
 *  per call so prior state never leaks across edits. */
const format = (digits: string, country: CountryCode): string =>
    digits ? new AsYouType(country).input(digits) : '';

/** Parse a stored E.164 value to extract country + canonical national
 *  display. Returns null when the value isn't a parseable phone. */
const parseInitial = (
    value: string,
    fallbackCountry: CountryCode,
): { country: CountryCode; display: string } | null => {
    if (!value) return null;
    try {
        const p = parsePhoneNumber(value);
        // For shared-code parsers (e.g. +44 → "GG" Guernsey), the
        // canonical national format from `formatNational` is the most
        // user-friendly initial display. Falls back to digits if the
        // formatter returns empty.
        const country = (p.country as CountryCode | undefined) ?? fallbackCountry;
        const display = p.formatNational() || p.nationalNumber.toString();
        return { country, display };
    } catch {
        return null;
    }
};

/** Build an E.164 string from a country + national digits. Used by
 *  onChange to keep the parent's stored value canonical. Returns ""
 *  for no digits; falls back to raw "+ccDIGITS" if libphonenumber
 *  can't parse (typically a too-short partial). */
const toE164 = (country: CountryCode, digits: string): string => {
    if (!digits) return '';
    const raw = `+${getCountryCallingCode(country)}${digits}`;
    try {
        return parsePhoneNumber(raw).number;
    } catch {
        return raw;
    }
};

const PhoneInput = ({
    value,
    onChange,
    label = 'Phone',
    placeholder = '(555) 123-4567',
    defaultCountry = 'US',
    disabled = false,
}: PhoneInputProps) => {
    const { t } = useTranslation();
    const fieldId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const countryBtnRef = useRef<HTMLButtonElement | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [filter, setFilter] = useState('');

    // Internal state: the user's in-progress formatted national string
    // and the chosen country. Initialized from the incoming E.164 value
    // (if any) on mount.
    const initial = useMemo(
        () => parseInitial(value, defaultCountry),
        // Intentionally only on mount — subsequent external `value`
        // changes are handled by the syncing useEffect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const [country, setCountry] = useState<CountryCode>(
        initial?.country ?? defaultCountry,
    );
    const [display, setDisplay] = useState<string>(initial?.display ?? '');

    // Re-sync when the parent's `value` changes externally (e.g. server
    // hydration arriving after mount, or a parent reset). We skip the
    // sync when the incoming value already matches what we'd emit from
    // our current internal state — that's the round-trip from a local
    // edit, and overwriting `display` here would clobber the user's
    // mid-typed partial (e.g. they typed "5551" and the parent stored
    // "+15551"; on re-render we don't want to reformat to "(555) 1").
    useEffect(() => {
        const ours = toE164(country, onlyDigits(display));
        if (value === ours) return;
        const next = parseInitial(value, defaultCountry);
        if (next) {
            setCountry(next.country);
            setDisplay(next.display);
        } else {
            setDisplay('');
        }
        // `country` + `display` intentionally omitted: the comparison
        // already guards re-entry, and listing them would trigger this
        // effect on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, defaultCountry]);

    const handleNationalChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const digits = onlyDigits(e.target.value);
        const next = format(digits, country);
        setDisplay(next);
        onChange(toE164(country, digits));
    };

    const handleCountryPick = (nextCountry: CountryCode) => {
        setPickerOpen(false);
        setFilter('');
        setCountry(nextCountry);
        const digits = onlyDigits(display);
        setDisplay(format(digits, nextCountry));
        onChange(toE164(nextCountry, digits));
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };

    const filteredCountries = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return COUNTRY_OPTIONS;
        return COUNTRY_OPTIONS.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.callingCode.includes(q),
        );
    }, [filter]);

    return (
        <div className="phone-input-bare">
            {label && (
                <label
                    htmlFor={fieldId}
                    className="phone-input-bare-label"
                >
                    {label}
                </label>
            )}
            <div
                className="phone-input-bare-row"
                data-disabled={disabled || undefined}
            >
                <button
                    ref={countryBtnRef}
                    type="button"
                    className="phone-input-country-btn"
                    onClick={() => setPickerOpen(true)}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={pickerOpen}
                    aria-label={`Country: ${countryName(country)}`}
                >
                    <span
                        className="phone-input-country-flag"
                        aria-hidden="true"
                    >
                        {countryFlag(country)}
                    </span>
                    <span className="phone-input-country-code">
                        +{getCountryCallingCode(country)}
                    </span>
                    <KeyboardArrowDownRoundedIcon
                        className="phone-input-country-caret"
                        fontSize="small"
                    />
                </button>
                <input
                    id={fieldId}
                    ref={inputRef}
                    type="tel"
                    className="phone-input-bare-input ph-no-capture"
                    value={display}
                    onChange={handleNationalChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="tel-national"
                    inputMode="tel"
                    /* `ph-no-capture` strips this field from PostHog
                       autocapture entirely — element + metadata + any
                       label that might leak the phone number context.
                       Belt-and-braces with the SDK's default behavior of
                       not capturing <input> values; this also covers
                       click events on the field itself. */
                />
            </div>
            <Popover
                open={pickerOpen}
                anchorEl={countryBtnRef.current}
                onClose={() => {
                    setPickerOpen(false);
                    setFilter('');
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: { className: 'phone-input-popover' },
                }}
            >
                <div className="phone-input-popover-search">
                    <SearchRoundedIcon
                        className="phone-input-popover-search-icon"
                        fontSize="small"
                    />
                    <input
                        type="text"
                        className="phone-input-popover-search-input"
                        aria-label={t('account.profile.selectCountry')}
                        placeholder="Search country"
                        value={filter}
                        autoFocus
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <ul
                    className="phone-input-popover-list"
                    role="listbox"
                    aria-label="Country"
                >
                    {filteredCountries.length === 0 ? (
                        <li className="phone-input-popover-empty">
                            No countries match &ldquo;{filter}&rdquo;.
                        </li>
                    ) : (
                        filteredCountries.map((opt) => (
                            <li
                                key={opt.code}
                                role="option"
                                aria-selected={opt.code === country}
                            >
                                <button
                                    type="button"
                                    className={
                                        opt.code === country
                                            ? 'phone-input-popover-row is-selected'
                                            : 'phone-input-popover-row'
                                    }
                                    onClick={() =>
                                        handleCountryPick(opt.code)
                                    }
                                >
                                    <span
                                        className="phone-input-popover-flag"
                                        aria-hidden="true"
                                    >
                                        {countryFlag(opt.code)}
                                    </span>
                                    <span className="phone-input-popover-name">
                                        {opt.name}
                                    </span>
                                    <span className="phone-input-popover-code">
                                        +{opt.callingCode}
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </Popover>
        </div>
    );
};

export default PhoneInput;
