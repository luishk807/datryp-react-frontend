/**
 * Date/time helpers. Wraps moment so the rest of the app doesn't import it
 * directly — if we swap to dayjs / date-fns later, only this file changes.
 *
 * Note: places that need a real moment object (e.g. MUI's AdapterMoment in
 * InputField) still import moment directly. That's the one escape hatch.
 */
import moment from 'moment';

export type DateInput = string | number | Date | null | undefined;

const DEFAULT_FORMAT = 'YYYY-MM-DD';

/** Format a date value. Defaults to YYYY-MM-DD. */
export const formatDate = (value: DateInput, format: string = DEFAULT_FORMAT): string =>
    moment(value ?? undefined).format(format);

/** Current date/time, formatted. Defaults to YYYY-MM-DD. */
export const now = (format: string = DEFAULT_FORMAT): string => moment().format(format);

/** Whether two values fall on the same calendar day. */
export const isSameDay = (a: DateInput, b: DateInput): boolean =>
    moment(a ?? undefined).isSame(moment(b ?? undefined), 'day');

/** Whether `a` is after `b`. */
export const isAfter = (a: DateInput, b: DateInput): boolean =>
    moment(a ?? undefined).isAfter(moment(b ?? undefined));

/** Whether `a` is before `b`. */
export const isBefore = (a: DateInput, b: DateInput): boolean =>
    moment(a ?? undefined).isBefore(moment(b ?? undefined));

/** Whether a value parses as a valid date. Pass `inputFormat` for non-ISO inputs (e.g. 'HH:mm'). */
export const isValidDate = (value: DateInput, inputFormat?: string): boolean =>
    (inputFormat ? moment(value ?? undefined, inputFormat) : moment(value ?? undefined)).isValid();

/** Add (or subtract, with negative `n`) days to a date and format the result. */
export const addDays = (value: DateInput, n: number, format: string = DEFAULT_FORMAT): string =>
    moment(value ?? undefined).add(n, 'day').format(format);

/** Parse a value using `inputFormat`, then format it for output. Use when the
 *  source is non-ISO (e.g. 'HH:mm') and you need a different display format. */
export const reformatDate = (
    value: DateInput,
    inputFormat: string,
    outputFormat: string = DEFAULT_FORMAT
): string => moment(value ?? undefined, inputFormat).format(outputFormat);
