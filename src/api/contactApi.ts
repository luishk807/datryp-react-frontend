/**
 * Fetch wrapper for the public contact-form endpoint.
 *
 * The backend (FastAPI) at POST /contact relays the message to the DaTryp.com
 * inbox via SendGrid. Returns 503 when SendGrid isn't configured — the
 * caller renders that as an "email isn't set up yet" message instead of a
 * generic save-failed toast.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface ContactFormRequest {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export interface ContactFormResponse {
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

export const sendContactForm = async (
    payload: ContactFormRequest
): Promise<ContactFormResponse> => {
    const resp = await fetch(`${API_BASE}/contact`, {
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
    return (await resp.json()) as ContactFormResponse;
};
