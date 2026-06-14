import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import './index.scss';

type LoaderPhase = 'options' | 'build' | 'enrich';

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
    /** Optional override for the fixed sub-headline under the title.
     *  Defaults are phase-aware. */
    subtitle?: string;
}

// `labelKey` resolves against `aiTrip.loader.steps.*` at render time so the
// rotating status copy is translatable. The Icon stays paired with its key.
type Step = { Icon: React.ElementType; labelKey: string };

const OPTIONS_STEPS: Step[] = [
    { Icon: TuneRoundedIcon, labelKey: 'options.analyzing' },
    { Icon: PublicRoundedIcon, labelKey: 'options.scanning' },
    { Icon: WbSunnyRoundedIcon, labelKey: 'options.weather' },
    { Icon: EventAvailableRoundedIcon, labelKey: 'options.duration' },
    { Icon: SavingsRoundedIcon, labelKey: 'options.value' },
    { Icon: MapRoundedIcon, labelKey: 'options.ranking' },
    { Icon: AutoAwesomeIcon, labelKey: 'options.almost' },
];

const BUILD_STEPS: Step[] = [
    { Icon: AutoAwesomeIcon, labelKey: 'build.reading' },
    { Icon: MapRoundedIcon, labelKey: 'build.destination' },
    { Icon: EventAvailableRoundedIcon, labelKey: 'build.duration' },
    { Icon: FlightTakeoffRoundedIcon, labelKey: 'build.activities' },
    { Icon: PaymentsOutlinedIcon, labelKey: 'build.budget' },
    { Icon: AutoAwesomeIcon, labelKey: 'build.finalizing' },
];

// Bucket-list enrichment backfill — the one-time pass that turns a Pro
// user's existing plain goals into titled cards. Messaging is about the
// goals themselves, not trip planning, so it can't reuse BUILD_STEPS.
const ENRICH_STEPS: Step[] = [
    { Icon: AutoAwesomeIcon, labelKey: 'enrich.reading' },
    { Icon: TuneRoundedIcon, labelKey: 'enrich.title' },
    { Icon: PublicRoundedIcon, labelKey: 'enrich.themes' },
    { Icon: WbSunnyRoundedIcon, labelKey: 'enrich.personality' },
    { Icon: AutoAwesomeIcon, labelKey: 'enrich.polishing' },
];

const DEFAULT_TITLES: Record<LoaderPhase, string> = {
    options: 'Finding your destination matches',
    build: 'Crafting your trip',
    enrich: 'Polishing your bucket list',
};

const DEFAULT_SUBTITLES: Record<LoaderPhase, string> = {
    options: 'Hold tight — we’re matching your preferences to the right spots.',
    build: 'Hold tight — we’re shaping this into a real itinerary.',
    enrich: 'Your Pro perk — we’re turning your saved goals into rich cards.',
};

/**
 * Full-viewport AI loading overlay. Sparkle animation + rotating
 * status. Rendered through a portal so it sits above any modal /
 * dropdown without z-index gymnastics in the parent.
 */
const AiTripLoader = ({
    open,
    title,
    phase = 'build',
    subtitle,
}: AiTripLoaderProps) => {
    const { t } = useTranslation();
    const [stepIdx, setStepIdx] = useState(0);
    const steps =
        phase === 'options'
            ? OPTIONS_STEPS
            : phase === 'enrich'
              ? ENRICH_STEPS
              : BUILD_STEPS;

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
                <p className="ai-trip-loader-sub">
                    {subtitle ?? DEFAULT_SUBTITLES[phase]}
                </p>

                <div className="ai-trip-loader-step" key={stepIdx}>
                    <StepIcon className="ai-trip-loader-step-icon" />
                    <span className="ai-trip-loader-step-text">
                        {t(`aiTrip.loader.steps.${steps[stepIdx].labelKey}`)}
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
