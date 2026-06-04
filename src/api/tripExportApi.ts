/**
 * REST wrapper for the auto-export-on-confirm flow. The client generates the
 * itinerary PDF + Excel (same output as the in-app "Share & download"), then
 * uploads both here; the backend emails them to every trip member (organizer
 * included — that's how the organizer gets their confirmed copy). Multipart
 * upload, so we don't set Content-Type (the browser adds the boundary).
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

/** How many members got the itinerary email. */
export interface TripExportEmailResult {
    recipients: number;
    emails: number;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Filesystem-safe attachment stem from the trip name. */
const safeStem = (name?: string): string =>
    (name?.trim() || 'trip').replace(/[^\w.-]+/g, '_').slice(0, 80);

export const emailTripExport = async (
    tripId: string,
    pdf: Blob,
    excel: Blob,
    tripName?: string
): Promise<TripExportEmailResult> => {
    const stem = safeStem(tripName);
    const form = new FormData();
    form.append('pdf', pdf, `${stem}.pdf`);
    form.append('excel', excel, `${stem}.xlsx`);

    const resp = await fetch(`${API_BASE}/trips/${tripId}/export-email`, {
        method: 'POST',
        // No Content-Type — the browser sets multipart/form-data + boundary.
        headers: { ...authHeaders() },
        body: form,
    });
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `email trip export ${resp.status} ${resp.statusText}${
                detail ? ` — ${detail}` : ''
            }`
        );
    }
    return (await resp.json()) as TripExportEmailResult;
};
