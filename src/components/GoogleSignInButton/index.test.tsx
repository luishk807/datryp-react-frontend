import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../test/renderWithProviders';
import GoogleSignInButton from './index';

const GSI_SCRIPT_ID = 'datryp-gsi-script';

interface InitConfig {
    client_id: string;
    callback: (resp: { credential: string }) => void;
}

/** Stand up a fake Google Identity Services global + pre-inject the loader
 *  script so the component's render effect runs `init()` synchronously
 *  (jsdom never fires the real script's onload). */
const installGoogle = () => {
    let captured: InitConfig | null = null;
    const initialize = vi.fn((cfg: InitConfig) => {
        captured = cfg;
    });
    const renderButton = vi.fn();
    (window as unknown as { google: unknown }).google = {
        accounts: { id: { initialize, renderButton } },
    };
    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    document.head.appendChild(script);
    return { initialize, renderButton, getCaptured: () => captured };
};

afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
    document.getElementById(GSI_SCRIPT_ID)?.remove();
});

describe('GoogleSignInButton', () => {
    it('renders an unconfigured hint when the client id is missing', () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
        renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
        expect(
            screen.getByText(/Google sign-in is unconfigured/i)
        ).toBeInTheDocument();
        expect(document.querySelector('.google-signin-host')).toBeNull();
    });

    it("renders Google's managed button host when configured", async () => {
        vi.stubEnv(
            'VITE_GOOGLE_CLIENT_ID',
            'test-client.apps.googleusercontent.com'
        );
        const google = installGoogle();
        renderWithProviders(
            <GoogleSignInButton onCredential={vi.fn()} width={320} />
        );
        await waitFor(() => expect(google.initialize).toHaveBeenCalled());
        expect(google.renderButton).toHaveBeenCalled();
        expect(document.querySelector('.google-signin-host')).toBeTruthy();
        expect(screen.queryByText(/unconfigured/i)).not.toBeInTheDocument();
    });

    it('forwards the Google-issued credential to onCredential', async () => {
        vi.stubEnv(
            'VITE_GOOGLE_CLIENT_ID',
            'test-client.apps.googleusercontent.com'
        );
        const google = installGoogle();
        const onCredential = vi.fn();
        renderWithProviders(
            <GoogleSignInButton onCredential={onCredential} width={320} />
        );
        await waitFor(() => expect(google.getCaptured()).not.toBeNull());
        // Google invokes the initialize callback once the popup completes.
        google.getCaptured()!.callback({ credential: 'jwt-abc-123' });
        expect(onCredential).toHaveBeenCalledWith('jwt-abc-123');
    });
});
