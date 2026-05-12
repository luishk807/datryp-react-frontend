/**
 * COPPA age-gate helpers. Must match the backend rule in
 * `app/schemas/auth.py` so client/server enforcement agrees.
 */

export const MIN_SIGNUP_AGE = 13;

/** Calendar-year age from a `YYYY-MM-DD` date string. Returns 0 for empty/invalid. */
export const yearsSince = (dob: string): number => {
    if (!dob) return 0;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
        age -= 1;
    }
    return age;
};
