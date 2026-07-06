import { useCallback, useEffect, useState } from 'react';

/** Temperature unit the user reads weather in. Persisted so the choice sticks
 *  app-wide and across sessions. */
export type TempUnit = 'C' | 'F';

const STORAGE_KEY = 'datryp:temp-unit';
const CHANGE_EVENT = 'datryp:temp-unit-change';

/** The user's EXPLICIT saved choice, or null when they haven't picked one. */
const readStored = (): TempUnit | null => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'F' || v === 'C' ? v : null;
    } catch {
        return null;
    }
};

// The few places that use Fahrenheit day-to-day (US + a handful). Everyone
// else defaults to Celsius. An explicit user toggle always overrides this.
const FAHRENHEIT_COUNTRIES = new Set([
    'US',
    'BS',
    'BZ',
    'KY',
    'PW',
    'FM',
    'MH',
    'LR',
]);

/** The sensible DEFAULT unit for a residence country, before any explicit user
 *  choice — Fahrenheit for the few countries that use it, else Celsius. */
export const defaultUnitForCountry = (
    code: string | null | undefined
): TempUnit =>
    code && FAHRENHEIT_COUNTRIES.has(code.toUpperCase()) ? 'F' : 'C';

/**
 * The active temperature unit + setters. The user's explicit choice (saved in
 * `localStorage`) always wins; until they pick one, `fallback` decides (the
 * weather widget passes a country-derived default). Kept in sync across every
 * widget instance (same tab via a custom event) and across tabs (the native
 * `storage` event), so toggling on one card updates them all.
 */
export const useTempUnit = (fallback: TempUnit = 'C') => {
    const [stored, setStored] = useState<TempUnit | null>(readStored);

    useEffect(() => {
        const sync = () => setStored(readStored());
        window.addEventListener('storage', sync);
        window.addEventListener(CHANGE_EVENT, sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener(CHANGE_EVENT, sync);
        };
    }, []);

    const unit: TempUnit = stored ?? fallback;

    const setUnit = useCallback((next: TempUnit) => {
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* private mode / storage disabled — still update this session */
        }
        setStored(next);
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    const toggle = useCallback(
        () => setUnit(unit === 'C' ? 'F' : 'C'),
        [setUnit, unit]
    );

    return { unit, setUnit, toggle };
};

/** Round a Celsius value into the target unit (integer). */
export const convertTemp = (celsius: number, unit: TempUnit): number =>
    Math.round(unit === 'F' ? celsius * (9 / 5) + 32 : celsius);
