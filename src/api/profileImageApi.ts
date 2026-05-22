/**
 * REST wrappers for `/me/profile-image`. Multipart upload on POST,
 * idempotent clear on DELETE. The backend re-hosts the file on S3 under
 * `profile/<user_id>.jpg`, downscales to a 512px square, and returns the
 * public CloudFront URL with a cache-busting `?v=<ts>` suffix so the
 * frontend never serves a stale image after re-upload.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface ProfileImageResponseRaw {
    profile_image_url: string | null;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: string | undefined;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        /* ignore */
    }
    throw new Error(
        `${label} ${resp.status} ${resp.statusText}${
            detail ? ` — ${detail}` : ''
        }`
    );
};

export const uploadProfileImage = async (
    file: File
): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch(`${API_BASE}/me/profile-image`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
    });
    if (!resp.ok) await handleError(resp, 'upload profile image');
    const body = (await resp.json()) as ProfileImageResponseRaw;
    return body.profile_image_url;
};

export const removeProfileImage = async (): Promise<void> => {
    const resp = await fetch(`${API_BASE}/me/profile-image`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, 'remove profile image');
};
