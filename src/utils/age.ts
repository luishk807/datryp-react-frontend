/**
 * COPPA age-gate helpers. Must match the backend rule in
 * `app/schemas/auth.py` so client/server enforcement agrees.
 *
 * We collect year-of-birth only (less PII), so age math is approximate by
 * one year. The signup form pairs this check with an "I am at least 13"
 * checkbox to cover the ambiguity window.
 */

export const MIN_SIGNUP_AGE = 13;

/** Latest possible age this calendar year (`currentYear - birthYear`). Used
 *  for the client-side hard gate that mirrors the backend math — anyone who
 *  fails this is unambiguously under MIN_SIGNUP_AGE. Returns 0 on invalid
 *  input so empty/typo states never appear to qualify. */
export const yearsSinceBirthYear = (birthYear: number | null | undefined): number => {
    if (birthYear == null || !Number.isInteger(birthYear)) return 0;
    if (birthYear < 1900 || birthYear > new Date().getFullYear()) return 0;
    return new Date().getFullYear() - birthYear;
};

/** Year-of-birth range we accept on the signup form. Earliest is 1900 (no
 *  practical reason to allow older), latest is `currentYear - MIN_SIGNUP_AGE`
 *  so the dropdown can't suggest a year that would make the user under 13.
 *  Picking a more recent year would have failed `yearsSinceBirthYear` anyway,
 *  but exposing it in the picker was misleading UX. */
export const MIN_BIRTH_YEAR = 1900;
export const MAX_BIRTH_YEAR = new Date().getFullYear() - MIN_SIGNUP_AGE;
