/**
 * Fetch wrapper for share/email REST endpoints on the Python backend.
 */
import type { ShareEmailRequest } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface ShareEmailResponse {
    sent: boolean;
}

interface FastAPIDetailItem {
    msg?: string;
    loc?: (string | number)[];
}

const formatDetail = (detail: unknown): string | null => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return (detail as FastAPIDetailItem[])
            .map((item) => item?.msg ?? JSON.stringify(item))
            .join('; ');
    }
    return null;
};

export const shareEmail = async (
    payload: ShareEmailRequest
): Promise<ShareEmailResponse> => {
    const resp = await fetch(`${API_BASE}/share/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        let message = `${resp.status} ${resp.statusText}`;
        try {
            const body = await resp.json();
            const formatted = formatDetail(body?.detail);
            if (formatted) message = formatted;
        } catch {
            // ignore JSON parse errors
        }
        throw new Error(message);
    }
    return (await resp.json()) as ShareEmailResponse;
};
