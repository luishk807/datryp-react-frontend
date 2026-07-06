import { useCallback, useEffect, useState } from 'react';

/** Temperature unit the user reads weather in. Persisted so the choice sticks
 *  app-wide and across sessions. */
export type TempUnit = 'C' | 'F';

const STORAGE_KEY = 'datryp:temp-unit';
const CHANGE_EVENT = 'datryp:temp-unit-change';

const read = (): TempUnit => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'F' ? 'F' : 'C';
    } catch {
        return 'C';
    }
};

/**
 * The active temperature unit + setters. Backed by `localStorage` and kept in
 * sync across every widget instance (same tab via a custom event) and across
 * tabs (the native `storage` event), so toggling on one weather card updates
 * them all. Defaults to Celsius.
 */
export const useTempUnit = () => {
    const [unit, setUnitState] = useState<TempUnit>(read);

    useEffect(() => {
        const sync = () => setUnitState(read());
        window.addEventListener('storage', sync);
        window.addEventListener(CHANGE_EVENT, sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener(CHANGE_EVENT, sync);
        };
    }, []);

    const setUnit = useCallback((next: TempUnit) => {
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* private mode / storage disabled — still update this session */
        }
        setUnitState(next);
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    const toggle = useCallback(
        () => setUnit(read() === 'C' ? 'F' : 'C'),
        [setUnit]
    );

    return { unit, setUnit, toggle };
};

/** Round a Celsius value into the target unit (integer). */
export const convertTemp = (celsius: number, unit: TempUnit): number =>
    Math.round(unit === 'F' ? celsius * (9 / 5) + 32 : celsius);
