import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
// Self-host the thorvg render engine WASM. By default dotlottie-web fetches
// it from jsdelivr at runtime, which fails behind a corporate TLS proxy /
// offline — the canvas then freezes on a single frame and the logo never
// animates. Importing it with Vite's `?url` bundles the exact installed
// version as a local asset (hashed, cached, no CDN dependency) and points
// the player at it before any instance initializes.
import dotlottieWasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';
import './index.scss';

setWasmUrl(dotlottieWasmUrl);

interface PageLoaderProps {
    /** Optional message under the animation. Empty by default
     *  (animation-only); pass a string to show a caption. */
    label?: string;
}

/**
 * Full-viewport centered loader. Used as the Suspense fallback for
 * every lazy route in App.tsx, and as the auth-resolving placeholder
 * in AuthGate. Shows the branded logo animation (a dotLottie served
 * from `public/images/`) in place of the old MUI spinner.
 */
const PageLoader = ({ label = '' }: PageLoaderProps) => (
    <div
        className="page-loader"
        role="status"
        aria-live="polite"
        aria-label="Loading"
    >
        <DotLottieReact
            className="page-loader-lottie"
            src="/images/logo-icon.lottie"
            loop
            autoplay
        />
        {label && <p className="page-loader-label">{label}</p>}
    </div>
);

export default PageLoader;
