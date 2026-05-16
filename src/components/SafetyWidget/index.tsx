import './index.scss';
import classNames from 'classnames';
import type { SafetyInfo } from 'types';

const SAFETY_LEVEL_LABEL: Record<SafetyInfo['level'], string> = {
    low: 'Low risk',
    moderate: 'Moderate risk',
    high: 'High risk',
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
    const score = Math.max(0, Math.min(100, Math.round(info.score)));
    return (
        <div className={classNames('safety-widget', `level-${info.level}`)}>
            <div className="safety-widget-top">
                <span className="safety-widget-level">
                    {SAFETY_LEVEL_LABEL[info.level]}
                </span>
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
                aria-label={`Safety score ${score} out of 100`}
            >
                <div
                    className="safety-widget-meter-fill"
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="safety-widget-summary">{info.summary}</p>
            <p className="safety-widget-disclaimer">
                Approximate — verify with official travel advisories before travel.
            </p>
        </div>
    );
};

export default SafetyWidget;
