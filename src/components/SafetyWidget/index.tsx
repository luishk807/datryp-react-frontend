import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import type { SafetyInfo } from 'types';

const SAFETY_LEVEL_LABEL_KEY: Record<SafetyInfo['level'], string> = {
    low: 'detail.common.safetyWidget.low',
    moderate: 'detail.common.safetyWidget.moderate',
    high: 'detail.common.safetyWidget.high',
};

export interface SafetyWidgetProps {
    /** Backend-computed safety read: `score` (0-100), `level` (`low` | `moderate`
     *  | `high`), and a `summary` paragraph. */
    info: SafetyInfo;
}

/**
 * Safety meter: level-coloured pill + numeric score + a `role="meter"`
 * progress bar, followed by a summary line and an "approximate" disclaimer.
 * Colour palette switches via the `level-<value>` modifier class.
 */
const SafetyWidget = ({ info }: SafetyWidgetProps) => {
    const { t } = useTranslation();
    const score = Math.max(0, Math.min(100, Math.round(info.score)));
    const levelLabel = t(SAFETY_LEVEL_LABEL_KEY[info.level]);
    return (
        <div className={classNames('safety-widget', `level-${info.level}`)}>
            {/* The meter below (name + value text) already announces the level
                and score, so hide this visual duplicate from the a11y tree —
                it stays on-screen for sighted users. */}
            <div className="safety-widget-top" aria-hidden="true">
                <span className="safety-widget-level">{levelLabel}</span>
                <span className="safety-widget-score">
                    <strong>{score}</strong>
                    <span className="safety-widget-score-max">/100</span>
                </span>
            </div>
            <div
                className="safety-widget-meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                aria-valuetext={levelLabel}
                aria-label={t('detail.common.safetyWidget.scoreAria')}
            >
                <div
                    className="safety-widget-meter-fill"
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="safety-widget-summary">{info.summary}</p>
            <p className="safety-widget-disclaimer">
                {t('detail.common.safetyWidget.disclaimer')}
            </p>
        </div>
    );
};

export default SafetyWidget;
