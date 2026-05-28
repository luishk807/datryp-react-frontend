import { useEffect, useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import './index.scss';

interface AiSearchLoaderProps {
    /** Optional query string — surfaced in the headline so the loader
     *  reads as "Searching for 'X'…" instead of a generic spinner. */
    query?: string;
}

type Step = { Icon: React.ElementType; label: string };

const STEPS: Step[] = [
    { Icon: SearchRoundedIcon, label: 'Parsing your query…' },
    { Icon: PublicRoundedIcon, label: 'Scanning destinations worldwide…' },
    { Icon: StarRoundedIcon, label: 'Ranking the best matches…' },
    { Icon: PhotoLibraryRoundedIcon, label: 'Pulling photos and travel info…' },
    { Icon: AutoAwesomeIcon, label: 'Almost there — preparing your picks…' },
];

/**
 * Inline AI-flavored loader for the search results page. Animated
 * orb, rotating status pill, and a sweeping progress bar. Same visual
 * language as `AiTripLoader` (which is full-viewport overlay), but
 * inline — it sits inside the page content area so the header stays
 * usable and the user can navigate away mid-search.
 */
const AiSearchLoader = ({ query }: AiSearchLoaderProps) => {
    const [stepIdx, setStepIdx] = useState(0);

    useEffect(() => {
        const handle = setInterval(() => {
            setStepIdx((i) => (i + 1) % STEPS.length);
        }, 1600);
        return () => clearInterval(handle);
    }, []);

    const StepIcon = STEPS[stepIdx].Icon;
    const trimmedQuery = query?.trim();
    const headline = trimmedQuery
        ? `Searching for “${trimmedQuery}”`
        : 'Searching with AI';

    return (
        <div className="ai-search-loader" role="status" aria-live="polite">
            <div className="ai-search-loader-orb">
                <AutoAwesomeIcon className="ai-search-loader-orb-icon" />
                <span
                    className="ai-search-loader-orb-ring"
                    aria-hidden="true"
                />
                <span
                    className="ai-search-loader-orb-ring is-delayed"
                    aria-hidden="true"
                />
            </div>

            <h2 className="ai-search-loader-title">{headline}</h2>
            <p className="ai-search-loader-sub">
                Hold tight — pulling AI-curated picks just for you.
            </p>

            <div className="ai-search-loader-step" key={stepIdx}>
                <StepIcon className="ai-search-loader-step-icon" />
                <span className="ai-search-loader-step-text">
                    {STEPS[stepIdx].label}
                </span>
            </div>

            <div className="ai-search-loader-bar" aria-hidden="true">
                <span className="ai-search-loader-bar-fill" />
            </div>
        </div>
    );
};

export default AiSearchLoader;
