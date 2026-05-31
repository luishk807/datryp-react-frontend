import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import './index.scss';

type LoaderPhase = 'options' | 'build';

interface AiTripLoaderProps {
    /** Drives mount/unmount. When false the overlay is removed. */
    open: boolean;
    /** Optional title above the rolling status. Defaults are phase-aware. */
    title?: string;
    /** Which set of status messages to rotate.
     *  - `options` → preference analysis + destination shortlisting (fired
     *    by the wizard's "Show me destination options" button).
     *  - `build` (default) → day-by-day itinerary crafting (fired after the
     *    user picks a destination card).
     *  Two presets exist because friend-testing showed users were confused
     *  when the options-phase button looked dead; they need the same
     *  full-overlay reassurance, but with messages that match what's
     *  actually happening at that step. */
    phase?: LoaderPhase;
}

type Step = { Icon: React.ElementType; label: string };

const OPTIONS_STEPS: Step[] = [
    { Icon: TuneRoundedIcon, label: 'Analyzing your budget and interests…' },
    { Icon: PublicRoundedIcon, label: 'Scanning destinations worldwide…' },
    { Icon: EventAvailableRoundedIcon, label: 'Checking what fits your duration…' },
    { Icon: MapRoundedIcon, label: 'Ranking the best matches…' },
    { Icon: AutoAwesomeIcon, label: 'Almost there — preparing your picks…' },
];

const BUILD_STEPS: Step[] = [
    { Icon: AutoAwesomeIcon, label: 'Reading your bucket-list goal…' },
    { Icon: MapRoundedIcon, label: 'Picking the right destination…' },
    { Icon: EventAvailableRoundedIcon, label: 'Choosing the perfect duration…' },
    { Icon: FlightTakeoffRoundedIcon, label: 'Drafting day-by-day activities…' },
    { Icon: PaymentsOutlinedIcon, label: 'Setting a realistic budget…' },
    { Icon: AutoAwesomeIcon, label: 'Finalizing your itinerary…' },
];

const DEFAULT_TITLES: Record<LoaderPhase, string> = {
    options: 'Finding your destination matches',
    build: 'Crafting your trip',
};

const DEFAULT_SUBTITLES: Record<LoaderPhase, string> = {
    options: 'Hold tight — we’re matching your preferences to the right spots.',
    build: 'Hold tight — we’re shaping this into a real itinerary.',
};

/**
 * Full-viewport AI loading overlay. Sparkle animation + rotating
 * status. Rendered through a portal so it sits above any modal /
 * dropdown without z-index gymnastics in the parent.
 */
const AiTripLoader = ({ open, title, phase = 'build' }: AiTripLoaderProps) => {
    const [stepIdx, setStepIdx] = useState(0);
    const steps = phase === 'options' ? OPTIONS_STEPS : BUILD_STEPS;

    useEffect(() => {
        if (!open) return;
        setStepIdx(0);
        const handle = setInterval(() => {
            setStepIdx((i) => (i + 1) % steps.length);
        }, 1800);
        return () => clearInterval(handle);
    }, [open, steps.length]);

    if (!open) return null;

    const StepIcon = steps[stepIdx].Icon;

    return createPortal(
        <div className="ai-trip-loader" role="status" aria-live="polite">
            <div className="ai-trip-loader-card">
                <div className="ai-trip-loader-orb">
                    <AutoAwesomeIcon className="ai-trip-loader-orb-icon" />
                    <span className="ai-trip-loader-orb-ring" aria-hidden="true" />
                    <span className="ai-trip-loader-orb-ring is-delayed" aria-hidden="true" />
                </div>

                <h2 className="ai-trip-loader-title">
                    {title ?? DEFAULT_TITLES[phase]}
                </h2>
                <p className="ai-trip-loader-sub">{DEFAULT_SUBTITLES[phase]}</p>

                <div className="ai-trip-loader-step" key={stepIdx}>
                    <StepIcon className="ai-trip-loader-step-icon" />
                    <span className="ai-trip-loader-step-text">
                        {steps[stepIdx].label}
                    </span>
                </div>

                <div className="ai-trip-loader-bar" aria-hidden="true">
                    <span className="ai-trip-loader-bar-fill" />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AiTripLoader;
