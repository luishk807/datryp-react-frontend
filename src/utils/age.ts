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
 *  practical reason to allow older), latest is the current year (somebody
 *  born this year is obviously under 13, but the form-level check will reject
 *  them — we keep the dropdown range generous so a busy user typing the
 *  wrong year doesn't see an immediate validation flicker). */
export const MIN_BIRTH_YEAR = 1900;
export const MAX_BIRTH_YEAR = new Date().getFullYear();
