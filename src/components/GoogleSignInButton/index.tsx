import { useEffect, useRef, useState } from 'react';
import './index.scss';

/** Type sketch of the bits of Google Identity Services we use. The
 *  library's official types live in `@types/google.accounts` but we
 *  only touch two functions, so an inline shape avoids the extra dep. */
interface GoogleIdentityNamespace {
    accounts: {
        id: {
            initialize: (config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
                ux_mode?: 'popup' | 'redirect';
                auto_select?: boolean;
            }) => void;
            renderButton: (
                element: HTMLElement,
                options: {
                    type?: 'standard' | 'icon';
                    theme?: 'outline' | 'filled_blue' | 'filled_black';
                    size?: 'large' | 'medium' | 'small';
                    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                    width?: number;
                    locale?: string;
                }
            ) => void;
        };
    };
}

declare global {
    interface Window {
        google?: GoogleIdentityNamespace;
    }
}

const GSI_SCRIPT_ID = 'datryp-gsi-script';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleSignInButtonProps {
    /** Called with the Google-issued ID token (JWT) once the user
     *  completes the popup. The caller is expected to POST this to
     *  `/auth/google` to exchange it for a DaTryp.com JWT. */
    onCredential: (credential: string) => void;
    /** Override the button's prompt text. Default: "continue_with". */
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    /** Pixel width passed to Google's `renderButton`. Google clamps to
     *  the 200..400 range; values outside that are ignored. Omit to
     *  auto-size to the host container's current width — that's the
     *  right behavior on mobile, where a fixed 320 leaves a strip of
     *  empty space inside a wider parent. */
    width?: number;
}

// Google's renderButton clamps width to 200..400px and ignores values
// outside that band. Mirror the bounds here so the auto-measured value
// stays inside the supported range.
const GOOGLE_MIN_WIDTH = 200;
const GOOGLE_MAX_WIDTH = 400;

/** Lazy-loads Google Identity Services and renders Google's official
 *  "Sign in with Google" button into a hidden host div. The button is
 *  fully managed by Google — we just hand them a callback for the
 *  credential.
 *
 *  Requires `VITE_GOOGLE_CLIENT_ID` to be set in `.env`; renders a
 *  disabled placeholder hint when missing so the page doesn't crash
 *  during local setup. */
const GoogleSignInButton = ({
    onCredential,
    text = 'continue_with',
    width,
}: GoogleSignInButtonProps) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
        | string
        | undefined;
    // When `width` is omitted, we track the host container's measured
    // width here. Starts as null so the initial render skips Google's
    // renderButton until we've laid out at least once (Google's iframe
    // is pixel-sized, so re-rendering at the right width up front is
    // cheaper than re-laying it out after a wrong-width first paint).
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(
        width ?? null
    );

    useEffect(() => {
        // Skip measuring when the caller passed an explicit width — they
        // want pixel-perfect control (e.g. a desktop card that needs a
        // specific size regardless of container).
        if (width !== undefined) {
            setMeasuredWidth(width);
            return;
        }
        if (!hostRef.current) return;
        const el = hostRef.current;
        const apply = (w: number) => {
            const clamped = Math.max(
                GOOGLE_MIN_WIDTH,
                Math.min(GOOGLE_MAX_WIDTH, Math.round(w))
            );
            setMeasuredWidth(clamped);
        };
        // Initial measurement off the laid-out host. Use offsetWidth so
        // we read the rendered box, not a CSS-declared width.
        apply(el.offsetWidth);
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            apply(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [width]);

    useEffect(() => {
        if (!clientId) return;
        if (!hostRef.current) return;
        if (measuredWidth === null) return;

        const init = () => {
            const g = window.google;
            if (!g || !hostRef.current) return;
            g.accounts.id.initialize({
                client_id: clientId,
                callback: (resp) => onCredential(resp.credential),
                ux_mode: 'popup',
                auto_select: false,
            });
            // Empty the host before re-rendering so a remount doesn't
            // stack multiple buttons. Google's render call appends an
            // iframe; double-render leaves duplicates.
            hostRef.current.innerHTML = '';
            g.accounts.id.renderButton(hostRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text,
                shape: 'rectangular',
                width: measuredWidth,
            });
        };

        // Load the GIS script once per page lifetime, then init.
        const existing = document.getElementById(GSI_SCRIPT_ID);
        if (existing) {
            init();
            return;
        }
        const script = document.createElement('script');
        script.id = GSI_SCRIPT_ID;
        script.src = GSI_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = init;
        document.head.appendChild(script);
    }, [clientId, onCredential, text, measuredWidth]);

    if (!clientId) {
        return (
            <div className="google-signin-missing">
                Google sign-in is unconfigured.{' '}
                <span>Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable.</span>
            </div>
        );
    }

    return <div className="google-signin-host" ref={hostRef} />;
};

export default GoogleSignInButton;
