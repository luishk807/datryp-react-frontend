import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import './index.scss';

interface AiTripLoaderProps {
    /** Drives mount/unmount. When false the overlay is removed. */
    open: boolean;
    /** Optional title above the rolling status. Defaults to a friendly
     *  generic. The bucket-list call passes the goal text so the user
     *  sees the dream they're building toward. */
    title?: string;
}

/** Rotating status lines — give the user something to read while OpenAI
 *  does its thing. Order matters (matches a believable timeline). */
const STEPS: Array<{ Icon: React.ElementType; label: string }> = [
    { Icon: AutoAwesomeIcon, label: 'Reading your bucket-list goal…' },
    { Icon: MapRoundedIcon, label: 'Picking the right destination…' },
    { Icon: EventAvailableRoundedIcon, label: 'Choosing the perfect duration…' },
    { Icon: FlightTakeoffRoundedIcon, label: 'Drafting day-by-day activities…' },
    { Icon: PaymentsOutlinedIcon, label: 'Setting a realistic budget…' },
    { Icon: AutoAwesomeIcon, label: 'Finalizing your itinerary…' },
];

/**
 * Full-viewport AI loading overlay. Sparkle animation + rotating
 * status. Rendered through a portal so it sits above any modal /
 * dropdown without z-index gymnastics in the parent.
 */
const AiTripLoader = ({ open, title }: AiTripLoaderProps) => {
    const [stepIdx, setStepIdx] = useState(0);

    useEffect(() => {
        if (!open) return;
        setStepIdx(0);
        const handle = setInterval(() => {
            setStepIdx((i) => (i + 1) % STEPS.length);
        }, 1800);
        return () => clearInterval(handle);
    }, [open]);

    if (!open) return null;

    const StepIcon = STEPS[stepIdx].Icon;

    return createPortal(
        <div className="ai-trip-loader" role="status" aria-live="polite">
            <div className="ai-trip-loader-card">
                <div className="ai-trip-loader-orb">
                    <AutoAwesomeIcon className="ai-trip-loader-orb-icon" />
                    <span className="ai-trip-loader-orb-ring" aria-hidden="true" />
                    <span className="ai-trip-loader-orb-ring is-delayed" aria-hidden="true" />
                </div>

                <h2 className="ai-trip-loader-title">
                    {title ?? 'Crafting your trip with AI'}
                </h2>
                <p className="ai-trip-loader-sub">
                    Hold tight — we're shaping this into a real itinerary.
                </p>

                <div className="ai-trip-loader-step" key={stepIdx}>
                    <StepIcon className="ai-trip-loader-step-icon" />
                    <span className="ai-trip-loader-step-text">
                        {STEPS[stepIdx].label}
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
