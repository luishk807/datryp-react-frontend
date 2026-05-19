import { useEffect, useRef } from 'react';
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
     *  `/auth/google` to exchange it for a daTryp JWT. */
    onCredential: (credential: string) => void;
    /** Override the button's prompt text. Default: "continue_with". */
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

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
}: GoogleSignInButtonProps) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
        | string
        | undefined;

    useEffect(() => {
        if (!clientId) return;
        if (!hostRef.current) return;

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
                width: 320,
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
    }, [clientId, onCredential, text]);

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
