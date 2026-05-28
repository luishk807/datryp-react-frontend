import { CircularProgress } from '@mui/material';
import './index.scss';

interface PageLoaderProps {
    /** Optional message under the spinner. Defaults to "Loading…". Pass
     *  an empty string to hide the label entirely (spinner-only). */
    label?: string;
}

/**
 * Full-viewport centered loader. Used as the Suspense fallback for
 * every lazy route in App.tsx, and as the auth-resolving placeholder
 * in AuthGate. Replaces the legacy `<>...</>` text fallback (which
 * rendered as bare dots in the top-left corner of the viewport).
 */
const PageLoader = ({ label = 'Loading…' }: PageLoaderProps) => (
    <div className="page-loader" role="status" aria-live="polite">
        <CircularProgress
            className="page-loader-spinner"
            size={44}
            thickness={4}
        />
        {label && <p className="page-loader-label">{label}</p>}
    </div>
);

export default PageLoader;
