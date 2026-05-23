import './index.scss';
import classNames from 'classnames';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import type { PopularityInfo, PopularityTrend } from 'types';

const TREND_LABEL: Record<PopularityTrend, string> = {
    rising: 'Rising',
    steady: 'Steady',
    falling: 'Cooling',
};

const TREND_ICON: Record<PopularityTrend, React.ReactNode> = {
    rising: <TrendingUpRoundedIcon fontSize="inherit" />,
    steady: <TrendingFlatRoundedIcon fontSize="inherit" />,
    falling: <TrendingDownRoundedIcon fontSize="inherit" />,
};

/** Coarse popularity band — drives the color palette + headline label.
 *  Mirrors the SafetyWidget pattern where the score number is paired with
 *  a categorical descriptor so a quick glance carries meaning. */
type PopularityLevel = 'hot' | 'popular' | 'niche';

const levelForScore = (score: number): PopularityLevel => {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'popular';
    return 'niche';
};

const LEVEL_LABEL: Record<PopularityLevel, string> = {
    hot: 'Trending',
    popular: 'Popular',
    niche: 'Off the radar',
};

export interface PopularityWidgetProps {
    /** Backend-computed popularity read: 0-100 `score`, year-over-year
     *  `trend`, and a 1-sentence `summary` of what's driving it. */
    info: PopularityInfo;
}

/**
 * Animated popularity meter for the place-detail sidebar. Mirrors the
 * SafetyWidget structure (pill label + score + bar + summary + disclaimer)
 * but the fill bar animates from 0 → score on mount via a CSS keyframe
 * driven by `--popularity-target`, giving the widget its signature
 * "wake up and grow" entrance.
 */
const PopularityWidget = ({ info }: PopularityWidgetProps) => {
    const score = Math.max(0, Math.min(100, Math.round(info.score)));
    const level = levelForScore(score);
    return (
        <div
            className={classNames(
                'popularity-widget',
                `level-${level}`,
                `trend-${info.trend}`,
            )}
        >
            <div className="popularity-widget-top">
                <span className="popularity-widget-level">
                    {LEVEL_LABEL[level]}
                </span>
                <span className="popularity-widget-score">
                    <strong>{score}</strong>
                    <span className="popularity-widget-score-max">/100</span>
                </span>
            </div>
            <div
                className="popularity-widget-meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                aria-label={`Popularity score ${score} out of 100`}
            >
                <div
                    className="popularity-widget-meter-fill"
                    style={{ ['--popularity-target' as string]: `${score}%` }}
                />
            </div>
            <div className="popularity-widget-trend">
                <span className="popularity-widget-trend-icon" aria-hidden="true">
                    {TREND_ICON[info.trend]}
                </span>
                <span className="popularity-widget-trend-label">
                    {TREND_LABEL[info.trend]} this year
                </span>
            </div>
            <p className="popularity-widget-summary">{info.summary}</p>
            <p className="popularity-widget-disclaimer">
                Approximate — based on broad travel-interest signals.
            </p>
        </div>
    );
};

export default PopularityWidget;
