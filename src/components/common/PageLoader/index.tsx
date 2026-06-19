import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './index.scss';

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
