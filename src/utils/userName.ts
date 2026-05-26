/**
 * Pull a friendly first-name token out of a User shape. Falls back to
 * the email's local part when no name is set, and to a generic word
 * when both are missing. Used by personalized homepage cards
 * ("Skip the planning, Luis", "Luis's top pick this month", etc.) so
 * the copy stays warm without breaking when the profile is sparse.
 */
export interface MaybeNamedUser {
    name?: string | null;
    email?: string | null;
}

export const getUserFirstName = (
    user: MaybeNamedUser | null | undefined,
    fallback = 'traveler'
): string => {
    if (!user) return fallback;
    const raw = user.name?.trim();
    if (raw) {
        // Split on whitespace AND common separators (commas, hyphens
        // in compound first names stay glued together — "Jean-Luc"
        // reads as one first name).
        const first = raw.split(/\s+/, 1)[0];
        if (first) return first.charAt(0).toUpperCase() + first.slice(1);
    }
    const email = user.email?.trim();
    if (email) {
        const local = email.split('@', 1)[0];
        if (local) {
            // Light cleanup: strip dots/numbers, capitalize the
            // first letter so "luis.hk" reads as "Luis".
            const cleaned = local.replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
            const head = cleaned.split(/\s+/, 1)[0];
            if (head) return head.charAt(0).toUpperCase() + head.slice(1);
        }
    }
    return fallback;
};
