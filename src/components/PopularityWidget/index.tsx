import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import type { PopularityInfo, PopularityTrend } from 'types';

const TREND_LABEL_KEY: Record<PopularityTrend, string> = {
    rising: 'detail.common.popularityWidget.rising',
    steady: 'detail.common.popularityWidget.steady',
    falling: 'detail.common.popularityWidget.falling',
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

const LEVEL_LABEL_KEY: Record<PopularityLevel, string> = {
    hot: 'detail.common.popularityWidget.hot',
    popular: 'detail.common.popularityWidget.popular',
    niche: 'detail.common.popularityWidget.niche',
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
    const { t } = useTranslation();
    const score = Math.max(0, Math.min(100, Math.round(info.score)));
    const level = levelForScore(score);
    const levelLabel = t(LEVEL_LABEL_KEY[level]);
    const trendLabel = t('detail.common.popularityWidget.trendThisYear', {
        trend: t(TREND_LABEL_KEY[info.trend]),
    });
    return (
        <div
            className={classNames(
                'popularity-widget',
                `level-${level}`,
                `trend-${info.trend}`,
            )}
        >
            {/* Score + level are announced by the meter (name + value text)
                below; hidden from the a11y tree but kept on-screen. */}
            <div className="popularity-widget-top" aria-hidden="true">
                <span className="popularity-widget-level">{levelLabel}</span>
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
                aria-valuetext={`${score}, ${levelLabel}, ${trendLabel}`}
                aria-label={t('detail.common.popularityWidget.scoreAria')}
            >
                <div
                    className="popularity-widget-meter-fill"
                    style={{ ['--popularity-target' as string]: `${score}%` }}
                />
            </div>
            {/* Trend phrase is folded into the meter's value text above —
                hidden from the a11y tree, still shown for sighted users. */}
            <div className="popularity-widget-trend" aria-hidden="true">
                <span className="popularity-widget-trend-icon">
                    {TREND_ICON[info.trend]}
                </span>
                <span className="popularity-widget-trend-label">
                    {trendLabel}
                </span>
            </div>
            <p className="popularity-widget-summary">{info.summary}</p>
            <p className="popularity-widget-disclaimer">
                {t('detail.common.popularityWidget.disclaimer')}
            </p>
        </div>
    );
};

export default PopularityWidget;
